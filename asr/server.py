from __future__ import annotations

import os
import tempfile
import time
import uuid
from pathlib import Path
from threading import Lock, Thread

try:
    from flask import Flask, jsonify, make_response, request
    from faster_whisper import WhisperModel
except ImportError as exc:
    raise SystemExit("Python packages are missing. Run asr\\install.bat once before starting the recognition service.") from exc


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_NAME = os.environ.get("LYRICCUT_MODEL", "large-v3")
API_VERSION = 5
MODEL_PATH = MODEL_DIR / "faster-whisper-large-v3"
MAX_FILE_BYTES = 500 * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".mp4", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_BYTES
print(f"Loading {MODEL_NAME} from local files only. No model/API downloads are allowed at runtime.", flush=True)
try:
    model = WhisperModel(
        str(MODEL_PATH) if (MODEL_PATH / "model.bin").is_file() else MODEL_NAME,
        device=os.environ.get("LYRICCUT_DEVICE", "cpu"),
        compute_type=os.environ.get("LYRICCUT_COMPUTE_TYPE", "int8"),
        cpu_threads=max(2, (os.cpu_count() or 4) - 1),
        download_root=str(MODEL_DIR),
        local_files_only=True,
    )
except Exception as exc:
    raise SystemExit(f"Local Whisper model is not installed or could not load. Run asr\\install.bat. Details: {exc}") from exc
transcription_lock = Lock()
jobs_lock = Lock()
jobs = {}
job_hints = {}


def update_job(job_id, **changes):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(changes)


def lyric_lines_from_segments(segments):
    """Group timestamped words into short subtitle lines, keeping word timing."""
    lines = []
    words_in_line = []

    def flush_line():
        if not words_in_line:
            return
        text = "".join(word["text"] for word in words_in_line).strip()
        start = words_in_line[0]["start"]
        end = words_in_line[-1]["end"]
        if text and end > start:
            lines.append({"start": start, "end": end, "text": text})
        words_in_line.clear()

    for segment in segments:
        segment_words = getattr(segment, "words", None) or []
        if not segment_words:
            flush_line()
            text = segment.text.strip()
            if text and segment.end > segment.start:
                lines.append({"start": float(segment.start), "end": float(segment.end), "text": text})
            continue

        for word in segment_words:
            text = word.word or ""
            start = float(word.start if word.start is not None else segment.start)
            end = float(word.end if word.end is not None else start)
            if not text.strip() or end <= start:
                continue
            candidate = "".join(item["text"] for item in words_in_line) + text
            gap = start - words_in_line[-1]["end"] if words_in_line else 0
            elapsed = end - words_in_line[0]["start"] if words_in_line else 0
            if words_in_line and (gap > 0.55 or len(candidate.strip()) > 38 or elapsed > 5.0):
                flush_line()
            words_in_line.append({"start": start, "end": end, "text": text})
            if text.strip().endswith((".", "!", "?", "。", "！", "？")):
                flush_line()
    flush_line()
    lines.sort(key=lambda line: (line["start"], line["end"]))
    cleaned = []
    for line in lines:
        line["start"] = max(0.0, float(line["start"]))
        line["end"] = max(line["start"] + 0.05, float(line["end"]))
        if cleaned:
            previous = cleaned[-1]
            gap = line["start"] - previous["end"]
            # Remove tiny alignment gaps to prevent a one-frame subtitle flicker.
            if 0 < gap <= 0.12:
                previous["end"] = line["start"]
        cleaned.append(line)
    return cleaned


def allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    from urllib.parse import urlparse

    parsed = urlparse(origin)
    host = (parsed.hostname or "").lower()
    return parsed.scheme in {"http", "https"} and (
        host in {"localhost", "127.0.0.1"} or host.endswith(".test")
    )


@app.before_request
def check_local_origin():
    origin = request.headers.get("Origin")
    if not allowed_origin(origin):
        return jsonify(error="This offline transcription service only accepts requests from a local LyricCut page."), 403
    if request.method == "OPTIONS":
        return make_response("", 204)


@app.after_request
def local_cors(response):
    origin = request.headers.get("Origin")
    if origin and allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
def health():
    return jsonify(status="ready", api_version=API_VERSION, model=MODEL_NAME,
                   device=os.environ.get("LYRICCUT_DEVICE", "cpu"))


@app.get("/languages")
def languages():
    return jsonify(model=MODEL_NAME, languages=[{"code": code} for code in model.supported_languages])


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error="Tệp vượt giới hạn 500 MB."), 413


def run_transcription(job_id, temp_path, language):
    update_job(job_id, status="processing", progress=6, message="Đang giải mã âm thanh")
    try:
        with transcription_lock:
            update_job(job_id, progress=7, message="Đang nhận dạng tiếng Việt theo ngữ cảnh bài hát" if language == "vi" else "Mô hình đang nhận dạng lời")
            segments, info = model.transcribe(
                str(temp_path),
                language=language,
                task="transcribe",
                beam_size=5,
                vad_filter=False,
                condition_on_previous_text=language == "vi",
                prompt_reset_on_temperature=0.5,
                word_timestamps=True,
                initial_prompt=(
                    "Nghe và chép nguyên văn lời bài hát tiếng Việt có dấu. Giữ đúng từ lặp lại, "
                    "cách nói đời thường và thứ tự từ; không dịch hay tự thêm lời."
                    if language == "vi" else None
                ),
                hotwords=job_hints.get(job_id) or None,
                hallucination_silence_threshold=1.5 if language == "vi" else None,
                log_progress=False,
            )
            duration = float(info.duration or 0)
            update_job(job_id, duration=duration, language=info.language,
                       language_probability=float(info.language_probability), progress=8,
                       message="Đang căn lời theo thời gian")
            raw_segments = []
            last_progress = 8
            for segment in segments:
                raw_segments.append(segment)
                if duration > 0:
                    current = min(94, 8 + int(86 * min(1.0, float(segment.end) / duration)))
                else:
                    current = min(94, 8 + len(raw_segments))
                if current > last_progress:
                    last_progress = current
                    update_job(job_id, progress=current,
                               message=f"Đang căn lời tới {float(segment.end):.0f}/{duration:.0f} giây")
            result = lyric_lines_from_segments(raw_segments)
        update_job(job_id, status="done", progress=100, message="Hoàn tất",
                   segments=result, duration=duration)
    except Exception as exc:
        app.logger.exception("Local transcription job %s failed", job_id)
        update_job(job_id, status="error", message=f"Nhận dạng thất bại: {exc}", error=str(exc))
    finally:
        temp_path.unlink(missing_ok=True)
        with jobs_lock:
            job_hints.pop(job_id, None)


@app.post("/transcribe")
def transcribe():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify(error="Chưa nhận được tệp âm thanh hoặc video."), 400
    extension = Path(uploaded.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify(error="Định dạng chưa hỗ trợ. Hãy dùng MP3, WAV, M4A, FLAC hoặc video MP4/MOV/WebM."), 415

    language = request.form.get("language", "").strip() or None
    if language and language not in model.supported_languages:
        return jsonify(error="Mã ngôn ngữ không được mô hình hỗ trợ."), 400
    hints = " ".join(request.form.get("hints", "").split())[:240]

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="lyriccut-", suffix=extension, delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            uploaded.save(temp_file)
        job_id = uuid.uuid4().hex
        with jobs_lock:
            jobs[job_id] = {
                "status": "queued", "progress": 6, "message": "Tệp đã tải lên; đang chờ mô hình",
                "created_at": time.time(), "model": MODEL_NAME,
            }
            job_hints[job_id] = hints
            expired = [key for key, value in jobs.items()
                       if value["status"] in {"done", "error"} and time.time() - value["created_at"] > 3600]
            for key in expired:
                jobs.pop(key, None)
                job_hints.pop(key, None)
        Thread(target=run_transcription, args=(job_id, temp_path, language), daemon=True).start()
        temp_path = None
        return jsonify(job_id=job_id, status="queued"), 202
    except Exception as exc:
        app.logger.exception("Local transcription failed")
        return jsonify(error=f"Nhận dạng cục bộ thất bại: {exc}"), 500
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


@app.get("/progress/<job_id>")
def transcription_progress(job_id):
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            return jsonify(error="Không tìm thấy tác vụ nhận dạng này."), 404
        snapshot = dict(job)
    snapshot.pop("created_at", None)
    return jsonify(snapshot)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8765, threaded=True, debug=False)
