<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const LYRICCUT_ASR_URL = 'http://127.0.0.1:8765';
const LYRICCUT_MAX_UPLOAD = 500 * 1024 * 1024;

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function iniBytes(string $value): int
{
    $value = trim($value);
    if ($value === '') {
        return 0;
    }
    $unit = strtolower(substr($value, -1));
    $bytes = (float)$value;
    return (int)($bytes * match ($unit) {
        'g' => 1024 ** 3,
        'm' => 1024 ** 2,
        'k' => 1024,
        default => 1,
    });
}

function asrHealthCheck(): bool
{
    $curl = curl_init(LYRICCUT_ASR_URL . '/health');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 1,
        CURLOPT_TIMEOUT => 2,
        CURLOPT_NOSIGNAL => true,
    ]);
    $body = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($body === false || $status !== 200) {
        return false;
    }
    $health = json_decode($body, true);
    return is_array($health) && ($health['status'] ?? '') === 'ready'
        && (int)($health['api_version'] ?? 0) >= 5;
}

function startAsrInBackground(): bool
{
    if (PHP_OS_FAMILY !== 'Windows') {
        return false;
    }
    $python = __DIR__ . DIRECTORY_SEPARATOR . 'asr' . DIRECTORY_SEPARATOR . '.venv' . DIRECTORY_SEPARATOR . 'Scripts' . DIRECTORY_SEPARATOR . 'python.exe';
    $model = __DIR__ . DIRECTORY_SEPARATOR . 'asr' . DIRECTORY_SEPARATOR . 'models' . DIRECTORY_SEPARATOR . 'faster-whisper-large-v3' . DIRECTORY_SEPARATOR . 'model.bin';
    $launcher = __DIR__ . DIRECTORY_SEPARATOR . 'asr' . DIRECTORY_SEPARATOR . 'launch-background.ps1';
    if (!is_file($python) || !is_file($model) || !is_file($launcher)) {
        return false;
    }
    $disabled = array_filter(array_map('trim', explode(',', (string)ini_get('disable_functions'))));
    if (!function_exists('popen') || in_array('popen', $disabled, true)) {
        return false;
    }
    $systemRoot = getenv('SystemRoot') ?: 'C:\\Windows';
    $powershell = $systemRoot . DIRECTORY_SEPARATOR . 'System32' . DIRECTORY_SEPARATOR . 'WindowsPowerShell' . DIRECTORY_SEPARATOR . 'v1.0' . DIRECTORY_SEPARATOR . 'powershell.exe';
    if (!is_file($powershell)) {
        return false;
    }
    $command = 'start "" /B ' . escapeshellarg($powershell)
        . ' -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ' . escapeshellarg($launcher)
        . ' >NUL 2>&1';
    $process = @popen($command, 'r');
    if (!is_resource($process)) {
        return false;
    }
    pclose($process);
    return true;
}

function ensureAsrReady(): ?string
{
    if (asrHealthCheck()) {
        return null;
    }
    $lockPath = __DIR__ . DIRECTORY_SEPARATOR . 'asr' . DIRECTORY_SEPARATOR . '.autostart.lock';
    $lock = @fopen($lockPath, 'c');
    if ($lock === false) {
        return 'Không tạo được khóa khởi động tự động. Kiểm tra quyền ghi của thư mục asr.';
    }
    if (flock($lock, LOCK_EX)) {
        if (!asrHealthCheck() && !startAsrInBackground()) {
            flock($lock, LOCK_UN);
            fclose($lock);
            return 'Thiếu môi trường Python/model hoặc PHP bị chặn quyền chạy tiến trình. Chạy asr\\install.bat một lần và bật quyền popen cho PHP.';
        }
        flock($lock, LOCK_UN);
    }
    fclose($lock);

    $deadline = microtime(true) + 180;
    do {
        usleep(500000);
        if (asrHealthCheck()) {
            return null;
        }
    } while (microtime(true) < $deadline);
    return 'Python service chưa sẵn sàng sau 180 giây. Kiểm tra asr\\server.log để xem lỗi khởi động model.';
}

function sameOriginRequest(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return true;
    }
    $scheme = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
    $expected = parse_url($scheme . '://' . ($_SERVER['HTTP_HOST'] ?? ''));
    $actual = parse_url($origin);
    $defaultPort = strtolower($scheme) === 'https' ? 443 : 80;
    return is_array($expected) && is_array($actual)
        && strtolower((string)($expected['scheme'] ?? '')) === strtolower((string)($actual['scheme'] ?? ''))
        && strtolower((string)($expected['host'] ?? '')) === strtolower((string)($actual['host'] ?? ''))
        && (int)($expected['port'] ?? $defaultPort) === (int)($actual['port'] ?? $defaultPort);
}

if (!sameOriginRequest()) {
    respond(403, ['error' => 'Yêu cầu phải đến từ cùng website LyricCut.']);
}

$action = $_GET['action'] ?? '';
if (!in_array($action, ['health', 'languages', 'transcribe', 'progress'], true)) {
    respond(404, ['error' => 'Tác vụ không hợp lệ.']);
}
if ($action === 'transcribe' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Yêu cầu nhận dạng phải dùng POST.']);
}
if ($action === 'transcribe') {
    set_time_limit(0);
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $postLimit = iniBytes((string)ini_get('post_max_size'));
    if ($contentLength > LYRICCUT_MAX_UPLOAD || ($postLimit > 0 && $contentLength > $postLimit)) {
        respond(413, ['error' => 'Tệp vượt giới hạn tải lên. Tăng post_max_size và upload_max_filesize trong php.ini (tối đa 500 MB).']);
    }
}
if ($action !== 'transcribe' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(405, ['error' => 'Phương thức yêu cầu không được hỗ trợ.']);
}
if ($action === 'progress' && !preg_match('/^[a-f0-9]{32}$/', (string)($_GET['job_id'] ?? ''))) {
    respond(400, ['error' => 'Mã tác vụ không hợp lệ.']);
}
if (!extension_loaded('curl')) {
    respond(500, ['error' => 'PHP cURL chưa được bật trên server.']);
}

$readyError = ensureAsrReady();
if ($readyError !== null) {
    respond(503, ['error' => $readyError]);
}

$url = LYRICCUT_ASR_URL . '/' . ($action === 'health' ? 'health' : ($action === 'progress' ? 'progress/' . rawurlencode((string)$_GET['job_id']) : $action));
$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => $action === 'transcribe' ? 1800 : 15,
    CURLOPT_NOSIGNAL => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
]);

if ($action === 'transcribe') {
    $upload = $_FILES['file'] ?? null;
    if (!$upload || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $uploadError = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
        $message = $uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE
            ? 'Tệp vượt giới hạn tải lên của PHP. Tăng upload_max_filesize và post_max_size trong php.ini.'
            : 'Chọn tệp âm thanh hoặc video trước.';
        respond(400, ['error' => $message]);
    }
    if ((int)$upload['size'] > LYRICCUT_MAX_UPLOAD) {
        respond(413, ['error' => 'Tệp vượt giới hạn 500 MB.']);
    }
    if (!is_uploaded_file($upload['tmp_name'])) {
        respond(400, ['error' => 'Tệp tải lên không hợp lệ.']);
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']) ?: 'application/octet-stream';
    $filename = basename((string)$upload['name']);
    $fields = [
        'file' => new CURLFile($upload['tmp_name'], $mime, $filename),
        'language' => (string)($_POST['language'] ?? ''),
    ];
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, $fields);
}

$body = curl_exec($curl);
$curlError = curl_error($curl);
$status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
if ($body === false) {
    respond(503, ['error' => 'Mô hình trên server chưa sẵn sàng. Server sẽ tự khởi động mô hình; kiểm tra asr\\server-error.log nếu lỗi còn tiếp diễn. ' . $curlError]);
}
http_response_code($status ?: 502);
echo $body;
