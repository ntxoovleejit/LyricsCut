(() => {
  const $ = (s) => document.querySelector(s);
  const themeToggle = $('#themeToggle');
  function applyTheme(theme, persist = true) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    const isLight = nextTheme === 'light';
    if (themeToggle) {
      themeToggle.textContent = isLight ? '☾' : '☼';
      themeToggle.setAttribute('aria-label', isLight ? 'Bật giao diện tối' : 'Bật giao diện sáng');
      themeToggle.title = isLight ? 'Bật giao diện tối' : 'Bật giao diện sáng';
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#f3f5f2' : '#101113');
    if (persist) { try { localStorage.setItem('lyriccut-theme', nextTheme); } catch {} }
  }
  applyTheme(document.documentElement.dataset.theme || 'dark', false);
  themeToggle?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
  const helpButton = $('#helpButton');
  const helpModal = $('#helpModal');
  const helpClose = $('#helpClose');
  function closeHelp() {
    if (!helpModal || helpModal.hidden) return;
    helpModal.hidden = true;
    helpButton?.focus();
  }
  helpButton?.addEventListener('click', () => {
    if (!helpModal) return;
    helpModal.hidden = false;
    helpClose?.focus();
  });
  helpClose?.addEventListener('click', closeHelp);
  helpModal?.addEventListener('click', event => { if (event.target === helpModal) closeHelp(); });
  helpModal?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeHelp(); }
  });
  const copyrightYear = $('#helpCopyrightYear');
  if (copyrightYear) copyrightYear.textContent = String(new Date().getFullYear());
  const video = $('#videoPreview');
  const image = $('#imagePreview');
  const audio = new Audio();
  audio.preload = 'metadata';
  const toastEl = $('#toast');
  let toastTimer;
  let mediaUrl = '';
  let audioUrl = '';
  let captions = [];
  let selectedCaption = -1;
  const textOverlays = [];
  let selectedText = -1;
  let duration = 30;
  let imagePlaying = false;
  let assets = [];
  let activeMedia = null;
  let imageClock = null;
  const mediaClips = { visual: null, audio: null };
  let resizeDrag = null;
  let captionDrag = null;
  let asrFile = null;
  const asrBase = new URL('asr-proxy.php', window.location.href).pathname;
  const showToast = (message) => { toastEl.textContent = message; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800); };
  const time = (seconds) => { const s = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const safeName = (name) => name.length > 25 ? `${name.slice(0, 22)}…` : name;
  function addAsset(file, kind, url) {
    const list = $('#assetList');
    list.querySelector('.empty-assets')?.remove();
    const item = document.createElement('div'); item.className = 'asset-item';
    const asset = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, file, kind, url, item };
    item.dataset.assetId = asset.id; assets.push(asset);
    const thumb = document.createElement('div'); thumb.className = 'asset-thumb'; thumb.textContent = kind === 'video' ? '▣' : kind === 'audio' ? '♫' : '▧';
    if (kind === 'image') { const img = document.createElement('img'); img.src = URL.createObjectURL(file); thumb.textContent = ''; thumb.append(img); }
    const meta = document.createElement('div'); meta.className = 'asset-meta';
    const name = document.createElement('b'); name.textContent = safeName(file.name);
    const detail = document.createElement('small'); detail.textContent = `${kind === 'video' ? 'Video' : kind === 'audio' ? 'Âm thanh' : 'Hình ảnh'} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    meta.append(name, detail); item.append(thumb, meta); list.prepend(item);
    $('#assetCount').textContent = list.querySelectorAll('.asset-item').length;
    return asset;
  }
  function updateTimelineDuration() {
    const ends = [...Object.values(mediaClips).filter(Boolean).map(clip => clip.end), ...textOverlays.map(item => item.end)];
    duration = ends.length ? Math.max(1, ...ends) : 30;
    $('#durationTime').textContent = time(duration);
    renderRuler(); drawTimelineClips(); renderCaptions(); renderTextTrack(); updateClock(Math.min(currentTime(), duration));
  }
  function renderRuler() {
    const ruler = $('.ruler'); ruler.replaceChildren();
    const step = duration <= 30 ? 5 : duration <= 90 ? 15 : 30;
    for (let seconds = 0; seconds <= duration; seconds += step) { const tick = document.createElement('span'); tick.textContent = time(seconds); ruler.append(tick); }
    if (Number(ruler.lastElementChild?.textContent?.split(':').join('')) < Number(time(duration).split(':').join(''))) { const tick = document.createElement('span'); tick.textContent = time(duration); ruler.append(tick); }
  }
  function drawClip(channel) {
    const clipData = mediaClips[channel]; const track = channel === 'visual' ? $('#videoTrack') : $('#audioTrack');
    track.replaceChildren();
    if (!clipData) { const placeholder = document.createElement('div'); placeholder.className = 'track-placeholder'; placeholder.textContent = channel === 'visual' ? 'Tải video lên để bắt đầu' : 'Thêm nhạc hoặc âm thanh'; track.append(placeholder); return; }
    const clip = document.createElement('div'); clip.className = `media-clip trim-clip ${clipData.css}`; clip.dataset.assetId = clipData.assetId; clip.dataset.channel = channel; clip.title = 'Kéo hai mép để cắt clip';
    clip.style.left = `${clipData.start / duration * 100}%`; clip.style.width = `${Math.max(0, (clipData.end - clipData.start) / duration * 100)}%`;
    const left = document.createElement('span'); left.className = 'trim-handle left'; left.setAttribute('aria-label','Kéo để chỉnh điểm bắt đầu');
    const label = document.createElement('span'); label.className = 'clip-label'; label.textContent = clipData.label;
    const right = document.createElement('span'); right.className = 'trim-handle right'; right.setAttribute('aria-label','Kéo để chỉnh điểm kết thúc');
    clip.append(left,label,right); track.append(clip);
    for (const handle of [left,right]) handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const trackRect = track.getBoundingClientRect();
      resizeDrag = {channel, edge:handle.classList.contains('left')?'start':'end', startX:event.clientX, originalStart:clipData.start, originalEnd:clipData.end, scaleDuration:duration, trackWidth:trackRect.width, pointerId:event.pointerId};
      timelineBody.setPointerCapture?.(event.pointerId);
    });
  }
  function drawTimelineClips() { drawClip('visual'); drawClip('audio'); }
  function setClip(_track, text, css, channel, asset, sourceDuration) {
    const clipDuration = Math.max(1, Number(sourceDuration) || 30);
    const type = asset?.kind || 'image';
    const end = type === 'image' ? Math.max(clipDuration, mediaClips.audio?.end || 0) : clipDuration;
    mediaClips[channel] = {label:text, css:css || '', assetId:asset?.id || '', start:0, end, sourceDuration:type === 'image' ? 3600 : clipDuration, type, autoFitAudio:type === 'image'};
    if (channel === 'audio' && mediaClips.visual?.type === 'image' && mediaClips.visual.autoFitAudio) mediaClips.visual.end = Math.max(.5, clipDuration);
    updateTimelineDuration();
  }
  function loadMedia(file) {
    if (!file) return;
    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    if (kind === 'video' || kind === 'audio') { asrFile = file; $('#modalFileName').textContent = file.name; }
    const url = URL.createObjectURL(file);
    const asset = addAsset(file, kind, url);
    if (kind === 'video') {
      if (mediaUrl && activeMedia?.kind === 'video') URL.revokeObjectURL(mediaUrl); mediaUrl = url; activeMedia = asset;
      image.style.display = 'none'; video.src = url; video.style.display = 'block'; $('#welcome').style.display = 'none';
      video.onloadedmetadata = () => setClip($('#videoTrack'), `▣  ${file.name}`, '', 'visual', asset, video.duration);
      showToast('Đã thêm video vào bản dựng');
    } else if (kind === 'audio') {
      if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = url; audio.src = url;
      audio.onloadedmetadata = () => setClip($('#audioTrack'), `♫  ${file.name}`, 'audio-clip', 'audio', asset, audio.duration);
      showToast('Đã thêm âm thanh vào timeline');
    } else {
      activeMedia = asset;
      video.pause(); video.removeAttribute('src'); video.load(); if (mediaUrl) URL.revokeObjectURL(mediaUrl); mediaUrl = '';
      image.src = url; image.style.display = 'block'; video.style.display = 'none'; $('#welcome').style.display = 'none';
      setClip($('#videoTrack'), `▧  ${file.name}`, '', 'visual', asset, 30); showToast('Đã thêm hình ảnh vào bản dựng');
    }
    return asset;
  }
  $('#mediaInput').addEventListener('change', (e) => { [...e.target.files].forEach(loadMedia); e.target.value = ''; });
  $('#audioInput').addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { asrFile = file; $('#modalFileName').textContent = file.name; $('#modalFile').dataset.file = file.name; loadMedia(file); } });
  function currentTime() { return video.src ? video.currentTime : audio.src ? audio.currentTime : Number($('#currentTime').dataset.seconds || 0); }
  let playbackRaf = 0;
  function startPlaybackTicker() {
    if (playbackRaf) return;
    const tick = () => {
      playbackRaf = 0;
      if (!((video.src && !video.paused) || (audio.src && !audio.paused) || imagePlaying)) return;
      const now = currentTime(); const shown = Number($('#currentTime').dataset.seconds || 0);
      if (!Number.isFinite(shown) || Math.abs(now - shown) > .02) updateClock(now);
      playbackRaf = requestAnimationFrame(tick);
    };
    playbackRaf = requestAnimationFrame(tick);
  }
  function updateClock(seconds) { $('#currentTime').textContent = time(seconds); $('#currentTime').dataset.seconds = seconds; const ruler = $('.ruler'); const pct = duration ? Math.max(0, Math.min(1, seconds / duration)) : 0; $('#playhead').style.left = `${ruler.offsetLeft + ruler.clientWidth * pct}px`; updateVisualVisibility(seconds); syncCaption(); syncTextOverlay(seconds); }
  function updateVisualVisibility(seconds) {
    const clip = mediaClips.visual;
    if (!clip || seconds < clip.start || seconds >= clip.end) { if (video.src) video.style.display = 'none'; if (image.src) image.style.display = 'none'; }
    else if (activeMedia?.kind === 'image') image.style.display = 'block';
    else if (activeMedia?.kind === 'video') video.style.display = 'block';
  }
  async function togglePlayback() {
    const playing = video.src ? !video.paused : audio.src ? !audio.paused : imagePlaying;
    if (playing) { video.pause(); audio.pause(); cancelAnimationFrame(imageClock); imageClock = null; imagePlaying = false; $('#playBtn').textContent = '▶'; return; }
    if (!video.src && !audio.src && !image.src) { showToast('Tải ảnh, video hoặc âm thanh lên để phát'); return; }
    const visualClip = mediaClips.visual; const audioClip = mediaClips.audio;
    let startAt = Number($('#currentTime').dataset.seconds || 0);
    if (visualClip && (startAt < visualClip.start || startAt >= visualClip.end)) startAt = visualClip.start;
    else if (audioClip && (startAt < audioClip.start || startAt >= audioClip.end)) startAt = audioClip.start;
    seek(startAt); $('#playBtn').textContent = 'Ⅱ';
    if (video.src && (!visualClip || startAt < visualClip.end)) { try { await video.play(); } catch { showToast('Không phát được video này trên trình duyệt'); } }
    if (audio.src && audioClip && startAt < audioClip.end) { try { await audio.play(); } catch { showToast('Không phát được âm thanh này trên trình duyệt'); } }
    if (!video.src && !audio.src && image.src) {
      imagePlaying = true; const start=Number($('#currentTime').dataset.seconds || 0); const began=performance.now(); const end=visualClip?.end || duration;
      const tickImage=(now) => { if(!imagePlaying) return; const t=start+(now-began)/1000; if(t>=end){imagePlaying=false;imageClock=null;$('#playBtn').textContent='▶';updateClock(end);return;} updateClock(t);imageClock=requestAnimationFrame(tickImage); };
      imageClock=requestAnimationFrame(tickImage); startPlaybackTicker();
    }
  }
  $('#playBtn').addEventListener('click', togglePlayback);
  video.addEventListener('play', () => { $('#playBtn').textContent = 'Ⅱ'; startPlaybackTicker(); const clip=mediaClips.audio; if(audio.src && (!clip || (video.currentTime>=clip.start && video.currentTime<clip.end))) { if(clip && Math.abs(audio.currentTime-video.currentTime)>.35) audio.currentTime=Math.min(video.currentTime,audio.duration||video.currentTime); audio.play().catch(()=>{}); } });
  audio.addEventListener('play', startPlaybackTicker);
  video.addEventListener('pause', () => { if (audio.src) audio.pause(); if (!audio.src) $('#playBtn').textContent = '▶'; });
  video.addEventListener('timeupdate', () => {
    const visualClip = mediaClips.visual; const audioClip = mediaClips.audio;
    if (visualClip && video.currentTime >= visualClip.end) { video.pause(); video.currentTime = visualClip.end; if (audio.src && (!audioClip || audio.currentTime >= audioClip.end)) audio.pause(); $('#playBtn').textContent = '▶'; }
    updateClock(video.currentTime);
    if (audio.src && audioClip && video.currentTime >= audioClip.start && video.currentTime < audioClip.end) {
      if (audio.paused && !video.paused) audio.play().catch(() => {});
      if (Math.abs(audio.currentTime - video.currentTime) > 0.35) audio.currentTime = Math.min(video.currentTime, audio.duration || video.currentTime);
    } else if (audio.src && !audio.paused) audio.pause();
  });
  audio.addEventListener('timeupdate', () => {
    const audioClip = mediaClips.audio;
    if (audioClip && audio.currentTime >= audioClip.end) { audio.pause(); audio.currentTime = audioClip.end; if (!video.src) $('#playBtn').textContent = '▶'; }
    if (!video.src) updateClock(audio.currentTime);
  });
  audio.addEventListener('ended', () => { $('#playBtn').textContent = '▶'; });
  video.addEventListener('ended', () => { audio.pause(); $('#playBtn').textContent = '▶'; });
  function seek(seconds) { const t = Math.max(0, Math.min(duration, seconds)); if (video.src && video.readyState > 0) video.currentTime = Math.min(t, video.duration || t); if (audio.src && audio.readyState > 0) audio.currentTime = Math.min(t, audio.duration || t); updateClock(t); }
  $('#backBtn').addEventListener('click', () => seek(currentTime() - 5));
  $('#forwardBtn').addEventListener('click', () => seek(currentTime() + 5));
  const timelineBody = $('#timelineBody');
  let timelineZoom = 1;
  const timelineZoomSlider = $('#timelineZoomControl');
  const MIN_TIMELINE_ZOOM = .25;
  const MAX_TIMELINE_ZOOM = 32;
  function syncTimelineZoomSlider() {
    if (!timelineZoomSlider) return;
    const ratio = Math.log(timelineZoom / MIN_TIMELINE_ZOOM) / Math.log(MAX_TIMELINE_ZOOM / MIN_TIMELINE_ZOOM);
    timelineZoomSlider.value = String(Math.round(ratio * 100));
    timelineZoomSlider.style.setProperty('--zoom-progress', `${Math.round(ratio * 100)}%`);
  }
  function applyTimelineZoom(anchorClientX = null, preservedRatio = null) {
    const ruler = $('.ruler'); const bodyRect = timelineBody.getBoundingClientRect();
    const oldWidth = ruler.clientWidth;
    const pointerX = anchorClientX ?? (bodyRect.left + bodyRect.width / 2);
    const timelinePoint = Math.max(0, timelineBody.scrollLeft + pointerX - bodyRect.left - 99);
    const anchorRatio = preservedRatio ?? (oldWidth ? Math.min(1, timelinePoint / oldWidth) : 0);
    const trackWidth = Math.max(430, timelineBody.clientWidth - 99 - 14) * timelineZoom;
    ruler.style.width = `${trackWidth}px`;
    ruler.style.minWidth = '0';
    timelineBody.querySelectorAll('.track-row').forEach(row => { row.style.width = `${99 + trackWidth}px`; row.style.minWidth = '0'; });
    timelineBody.querySelectorAll('.track-content').forEach(track => { track.style.minWidth = '0'; });
    $('.zoom-value').textContent = `${Math.round(timelineZoom * 100)}%`;
    syncTimelineZoomSlider();
    const wantedScroll = 99 + anchorRatio * trackWidth - (pointerX - bodyRect.left);
    timelineBody.scrollLeft = Math.max(0, wantedScroll);
    drawTimelineClips(); renderCaptions(); renderTextTrack(); updateClock(currentTime());
  }
  function setTimelineZoom(value, anchorClientX = null) {
    const nextZoom = Math.max(MIN_TIMELINE_ZOOM, Math.min(MAX_TIMELINE_ZOOM, value));
    if (nextZoom === timelineZoom) return;
    const bodyRect = timelineBody.getBoundingClientRect(); const ruler = $('.ruler'); const pointerX = anchorClientX ?? (bodyRect.left + bodyRect.width / 2);
    const timelinePoint = Math.max(0, timelineBody.scrollLeft + pointerX - bodyRect.left - 99);
    const anchorRatio = ruler.clientWidth ? Math.min(1, timelinePoint / ruler.clientWidth) : 0;
    timelineZoom = nextZoom; applyTimelineZoom(anchorClientX, anchorRatio);
  }
  timelineBody.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setTimelineZoom(timelineZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX);
  }, {passive:false});
  const zoomButtons = document.querySelectorAll('.timeline-actions .mini-action');
  zoomButtons[0]?.addEventListener('click', () => setTimelineZoom(timelineZoom / 1.2));
  zoomButtons[1]?.addEventListener('click', () => setTimelineZoom(timelineZoom * 1.2));
  timelineZoomSlider?.addEventListener('input', () => {
    const ratio = Number(timelineZoomSlider.value) / 100;
    setTimelineZoom(MIN_TIMELINE_ZOOM * Math.pow(MAX_TIMELINE_ZOOM / MIN_TIMELINE_ZOOM, ratio));
  });
  const timelineExpandButton = $('#timelineExpandBtn');
  function toggleTimelineExpanded(force) {
    const expanded = typeof force === 'boolean' ? force : !$('.timeline-panel').classList.contains('is-expanded');
    $('.timeline-panel').classList.toggle('is-expanded', expanded);
    timelineExpandButton?.setAttribute('aria-pressed', String(expanded));
    timelineExpandButton?.setAttribute('aria-label', expanded ? 'Thoát timeline toàn màn hình' : 'Mở timeline toàn màn hình');
    timelineExpandButton?.setAttribute('title', expanded ? 'Thoát timeline toàn màn hình' : 'Mở timeline toàn màn hình');
    requestAnimationFrame(() => applyTimelineZoom());
  }
  timelineExpandButton?.addEventListener('click', () => toggleTimelineExpanded());
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && $('.timeline-panel').classList.contains('is-expanded')) toggleTimelineExpanded(false); });
  window.addEventListener('resize', () => { applyTimelineZoom(); syncCaption(); });
  let scrubbing = false;
  function seekFromPointer(event) { const ruler = $('.ruler'); const rect = ruler.getBoundingClientRect(); const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); seek(progress * duration); }
  timelineBody.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target.closest('.track-label') || target.closest('.media-clip')) return;
    if (!target.closest('.ruler, .track-content, .playhead')) return;
    event.preventDefault(); scrubbing = true; timelineBody.setPointerCapture?.(event.pointerId); seekFromPointer(event);
  });
  timelineBody.addEventListener('pointermove', (event) => { if (scrubbing) seekFromPointer(event); });
  timelineBody.addEventListener('pointermove', (event) => {
    if (captionDrag) {
      const drag = captionDrag; const caption = captions[drag.index];
      if (caption && drag.trackWidth > 0) {
        const pixelDelta = event.clientX - drag.startX;
        if (Math.abs(pixelDelta) >= 3) drag.moved = true;
        if (drag.moved) {
          const delta = pixelDelta / drag.trackWidth * duration; const minLength = Math.min(.25, drag.originalEnd - drag.originalStart);
          if (drag.edge === 'start') caption.start = Math.max(0, Math.min(drag.originalEnd - minLength, drag.originalStart + delta));
          else if (drag.edge === 'end') caption.end = Math.max(drag.originalStart + minLength, Math.min(duration, drag.originalEnd + delta));
          else { const length = drag.originalEnd - drag.originalStart; caption.start = Math.max(0, Math.min(duration - length, drag.originalStart + delta)); caption.end = caption.start + length; }
          drag.node.style.left = `${caption.start / duration * 100}%`;
          drag.node.style.width = `${Math.max(.5, (caption.end - caption.start) / duration * 100)}%`;
          drag.node.title = `${time(caption.start)} – ${time(caption.end)} · Kéo giữa để di chuyển, kéo mép để đổi thời lượng · Nhấp đúp để sửa`;
          updateClock(currentTime());
        }
      }
    }
    if (!resizeDrag) return;
    const clip = mediaClips[resizeDrag.channel]; if (!clip) return;
    const delta = (event.clientX - resizeDrag.startX) / Math.max(1, resizeDrag.trackWidth) * resizeDrag.scaleDuration;
    if (resizeDrag.channel === 'visual' && clip.type === 'image' && Math.abs(event.clientX - resizeDrag.startX) >= 3) clip.autoFitAudio = false;
    const minLength = Math.min(0.5, resizeDrag.originalEnd - resizeDrag.originalStart);
    if (resizeDrag.edge === 'start') {
      clip.start = Math.max(0, Math.min(resizeDrag.originalEnd - minLength, resizeDrag.originalStart + delta));
    } else {
      const maxEnd = clip.type === 'image' ? 3600 : clip.sourceDuration;
      clip.end = Math.max(resizeDrag.originalStart + minLength, Math.min(maxEnd, resizeDrag.originalEnd + delta));
    }
    drawClip(resizeDrag.channel); updateClock(currentTime());
  });
  function finishPointer(event) {
    scrubbing = false;
    if (captionDrag) {
      if (event?.pointerId != null && captionDrag.pointerId !== event.pointerId) return;
      const didMove = captionDrag.moved; captionDrag = null;
      if (didMove) { renderCaptions(); syncInspector(); syncCaption(); showToast('Đã cập nhật vị trí và thời lượng câu lyrics'); }
    }
    if (!resizeDrag) return;
    if (event?.pointerId != null && resizeDrag.pointerId !== event.pointerId) return;
    const resizedChannel = resizeDrag.channel; resizeDrag = null;
    if (resizedChannel === 'audio' && mediaClips.visual?.type === 'image' && mediaClips.visual.autoFitAudio && mediaClips.audio) mediaClips.visual.end = Math.max(.5, mediaClips.audio.end);
    updateTimelineDuration();
  }
  timelineBody.addEventListener('pointerup', finishPointer);
  timelineBody.addEventListener('pointercancel', finishPointer);
  timelineBody.addEventListener('lostpointercapture', finishPointer);
  $('#fullscreenBtn').addEventListener('click', () => { const stage = $('#previewStage'); if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.(); });
  $('#renameProject').addEventListener('click', () => { const title = prompt('Tên dự án', $('#projectTitle').textContent); if (title?.trim()) { $('#projectTitle').textContent = title.trim(); $('#crumbProject').textContent = title.trim(); } });
  const modal = $('#modal');
  async function refreshAsrStatus() {
    const status = $('#asrStatus'); const select = $('#languageSelect');
    status.textContent = 'Đang kiểm tra và tự khởi động mô hình trên server…';
    try {
      const response = await fetch(`${asrBase}?action=languages`); if (!response.ok) throw new Error('model unavailable');
      const data = await response.json();
      if (!select.dataset.loaded) {
        const selected = select.value;
        data.languages.forEach(item => { if (select.querySelector(`option[value="${item.code}"]`)) return; const option = document.createElement('option'); option.value = item.code; let languageName = item.code; try { languageName = new Intl.DisplayNames(['vi'], {type:'language'}).of(item.code) || item.code; } catch {} option.textContent = `${languageName} (${item.code})`; select.append(option); });
        select.value = selected; select.dataset.loaded = '1';
      }
      status.textContent = `Mô hình ${data.model} sẵn sàng trên server của bạn. Tệp được xử lý tại server này.`; status.classList.add('asr-ready');
    } catch { status.textContent = 'Mô hình chưa sẵn sàng. Cài thư viện/model bằng asr\\install.bat; server sẽ tự khởi động khi app cần nhận dạng.'; status.classList.remove('asr-ready'); }
  }
  function openModal() { $('#transcribeProgress').hidden = true; $('#progressFill').style.width = '1%'; $('#progressPercent').textContent = '1%'; modal.classList.add('open'); refreshAsrStatus(); }
  $('#generateBtn').addEventListener('click', openModal);
  $('#closeModal').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  function renderCaptions() {
    const track = $('#captionTrack'); track.innerHTML = '';
    const lanes = [];
    const captionLanes = captions.map(caption => {
      let lane = lanes.findIndex(laneEnd => laneEnd <= caption.start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = caption.end;
      return lane;
    });
    const captionRow = track.closest('.caption-row');
    if (captionRow) captionRow.style.height = `${Math.max(48, 16 + Math.max(1, lanes.length) * 32)}px`;
    if (!captions.length) { const ph = document.createElement('div'); ph.className = 'track-placeholder'; ph.textContent = 'Lyrics của bạn sẽ nằm ở đây'; track.append(ph); }
    captions.forEach((caption, index) => {
      const clip = document.createElement('div'); clip.className = `media-clip caption-clip${index === selectedCaption ? ' selected' : ''}`; clip.tabIndex = 0; clip.title = `${time(caption.start)} – ${time(caption.end)} · Kéo giữa để di chuyển, kéo mép để đổi thời lượng · Nhấp đúp để sửa`;
      clip.dataset.captionIndex = index;
      clip.style.left = `${caption.start / duration * 100}%`;
      clip.style.width = `${Math.max(.5, (caption.end - caption.start) / duration * 100)}%`;
      clip.style.top = `${7 + captionLanes[index] * 32}px`;
      clip.style.height = '28px';
      clip.style.bottom = 'auto';
      const leftHandle = document.createElement('span'); leftHandle.className = 'caption-trim-handle left'; leftHandle.setAttribute('aria-label','Kéo để đổi thời điểm bắt đầu');
      const text = document.createElement('span'); text.className = 'caption-clip-text'; text.textContent = caption.text;
      const rightHandle = document.createElement('span'); rightHandle.className = 'caption-trim-handle right'; rightHandle.setAttribute('aria-label','Kéo để đổi thời điểm kết thúc');
      clip.append(leftHandle, text, rightHandle);
      clip.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation(); selectedCaption = index; selectedText=-1; syncInspector();
        track.querySelectorAll('.caption-clip').forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === index));
        const edge = event.target.closest('.caption-trim-handle'); const rect = track.getBoundingClientRect();
        captionDrag = {index, node:clip, edge:edge?.classList.contains('left')?'start':edge?'end':'move', startX:event.clientX, originalStart:caption.start, originalEnd:caption.end, trackWidth:rect.width, pointerId:event.pointerId, moved:false};
        clip.setPointerCapture?.(event.pointerId);
      });
      clip.addEventListener('click', () => { selectedCaption = index; selectedText=-1; seek(caption.start); syncInspector(); track.querySelectorAll('.caption-clip').forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === index)); syncCaption(); });
      clip.addEventListener('dblclick', () => openCaptionEditor(index));
      clip.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); openCaptionEditor(index); } });
      track.append(clip);
    });
    $('#captionCount').textContent = captions.length;
    syncInspectorVisibility();
  }
  function renderTextTrack() {
    const track=$('#textTrack'); if(!track) return; track.replaceChildren();
    if(!textOverlays.length){const placeholder=document.createElement('div');placeholder.className='track-placeholder';placeholder.textContent='Văn bản bạn thêm sẽ nằm ở đây';track.append(placeholder);}
    textOverlays.forEach((item,index)=>{
      const clip=document.createElement('div');clip.className=`media-clip text-overlay-clip${index===selectedText?' selected':''}`;clip.dataset.textIndex=index;clip.tabIndex=0;
      clip.style.left=`${item.start/duration*100}%`;clip.style.width=`${Math.max(.5,(item.end-item.start)/duration*100)}%`;clip.title=`${time(item.start)} – ${time(item.end)} · Nhấp đúp để sửa`;
      const label=document.createElement('span');label.className='text-clip-label';label.textContent=item.text;clip.append(label);
      clip.addEventListener('click',()=>{selectedText=index;selectedCaption=-1;seek(item.start);syncInspector();track.querySelectorAll('.text-overlay-clip').forEach((node,i)=>node.classList.toggle('selected',i===index));syncTextOverlay(currentTime());});
      clip.addEventListener('dblclick',()=>openTextEditor(index));
      clip.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();openTextEditor(index);}});
      track.append(clip);
    });
    $('#textCount').textContent=textOverlays.length;
    syncInspectorVisibility();
  }
  function syncTextOverlay(seconds) {
    const preview=$('#textOverlayPreview'); if(!preview) return;
    const active=textOverlays.filter(item=>seconds>=item.start&&seconds<item.end);
    if(!active.length){preview.style.display='none';return;}
    const signature=active.map(item=>`${item.id}:${item.text}`).join('|');
    if(preview.dataset.signature!==signature){
      preview.replaceChildren();
      active.forEach(item=>{const line=document.createElement('span');line.className='text-overlay-line';line.textContent=item.text.replace(/[\r\n]+/g,' ').trim();preview.append(line);});
      preview.dataset.signature=signature;
    }
    preview.style.display='flex';preview.style.fontFamily=$('#fontSelect').value;preview.style.color=$('#textColor').value;preview.style.fontSize=`${Math.max(16,Number($('#fontSize').value)*.8)}px`;
    preview.style.textShadow=$('#strokeToggle').classList.contains('on')?'0 2px 4px #000,1px 2px 4px #000':'none';
  }
  const textModal=$('#textModal'); const textInput=$('#textOverlayInput'); let editingTextIndex=-1;
  function openTextEditor(index=-1) {
    editingTextIndex=index; const item=textOverlays[index]; const isEditing=Boolean(item);
    if(isEditing){selectedText=index;selectedCaption=-1;syncInspector();}
    $('#textEditorTitle').textContent=isEditing?'Sửa văn bản':'Thêm văn bản';
    $('#textModalSave').textContent=isEditing?'Lưu thay đổi':'Thêm văn bản';
    textInput.value=item?.text||'';$('#textOverlayCount').textContent=`${textInput.value.length} / 240`;
    const start=item?.start??Math.max(0,Math.min(currentTime(),duration));
    $('#textEditorTiming').textContent=isEditing?`${time(item.start)} – ${time(item.end)}`:`Bắt đầu tại ${time(start)} · Thời lượng 4 giây`;
    textModal.hidden=false;requestAnimationFrame(()=>textInput.focus());
  }
  function closeTextEditor(){textModal.hidden=true;editingTextIndex=-1;}
  function saveTextOverlay(){
    const text=textInput.value.replace(/[\r\n]+/g,' ').trim();if(!text){showToast('Nhập nội dung văn bản trước khi lưu');textInput.focus();return;}
    if(editingTextIndex>=0&&textOverlays[editingTextIndex]) textOverlays[editingTextIndex].text=text;
    else {const start=Math.max(0,Math.min(currentTime(),duration));textOverlays.push({id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,text,start,end:start+4,position:'top'});selectedText=textOverlays.length-1;selectedCaption=-1;}
    closeTextEditor();updateTimelineDuration();renderTextTrack();syncInspector();syncTextOverlay(currentTime());showToast('Đã cập nhật văn bản trên timeline');
  }
  textInput.addEventListener('input',()=>{$('#textOverlayCount').textContent=`${textInput.value.length} / 240`;});
  $('#addTextBtn').addEventListener('click',()=>openTextEditor());
  $('#textModalClose').addEventListener('click',closeTextEditor);$('#textModalCancel').addEventListener('click',closeTextEditor);$('#textModalSave').addEventListener('click',saveTextOverlay);
  textModal.addEventListener('click',event=>{if(event.target===textModal)closeTextEditor();});
  textModal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeTextEditor();}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();saveTextOverlay();}});
  const captionEditor = document.createElement('div'); captionEditor.className = 'caption-editor-backdrop'; captionEditor.hidden = true;
  captionEditor.innerHTML = `<section class="caption-editor" role="dialog" aria-modal="true" aria-labelledby="captionEditorTitle"><header class="caption-editor-head"><div class="caption-editor-heading"><span class="caption-editor-icon">T</span><div><h2 id="captionEditorTitle">Chỉnh sửa lời bài hát</h2><p>Chỉnh câu chữ hiển thị trong video</p></div></div><button class="caption-editor-close" type="button" aria-label="Đóng">×</button></header><div class="caption-editor-timing"><span class="caption-editor-dot"></span><span>Đoạn phụ đề</span><b class="caption-editor-time"></b><span class="caption-editor-shortcut">Ctrl + Enter để lưu</span></div><label class="caption-editor-label" for="captionEditorText">Nội dung lời bài hát</label><textarea id="captionEditorText" maxlength="500" rows="4" placeholder="Nhập lời bài hát…"></textarea><div class="caption-editor-meta"><span class="caption-editor-error" aria-live="polite"></span><span class="caption-editor-count">0 / 500</span></div><div class="caption-editor-preview"><span class="caption-editor-preview-label"><i></i>XEM TRƯỚC</span><div class="caption-editor-preview-text"></div></div><footer class="caption-editor-actions"><button class="caption-editor-cancel" type="button">Hủy</button><button class="caption-editor-save" type="button"><span>✓</span> Lưu thay đổi</button></footer></section>`;
  document.body.append(captionEditor);
  const captionTextarea = captionEditor.querySelector('#captionEditorText');
  let editingCaptionIndex = -1; let captionEditorReturnFocus = null;
  function closeCaptionEditor() { captionEditor.hidden = true; editingCaptionIndex = -1; const target = captionEditorReturnFocus?.isConnected && captionEditorReturnFocus.getClientRects().length ? captionEditorReturnFocus : $('#captionTrack').querySelector('.caption-clip'); target?.focus?.(); captionEditorReturnFocus = null; }
  function saveCaptionEditor() {
    const text = captionTextarea.value.replace(/[\r\n]+/g,' ').trim();
    const error = captionEditor.querySelector('.caption-editor-error');
    if (!text) { error.textContent = 'Hãy nhập nội dung lời bài hát trước khi lưu.'; captionTextarea.focus(); return; }
    if (!captions[editingCaptionIndex]) return closeCaptionEditor();
    captions[editingCaptionIndex].text = text; selectedCaption = editingCaptionIndex;
    renderCaptions(); syncInspector(); syncCaption(); closeCaptionEditor(); showToast('Đã cập nhật lời bài hát');
  }
  function openCaptionEditor(index) {
    const caption = captions[index]; if (!caption) return;
    editingCaptionIndex = index; captionEditorReturnFocus = document.activeElement;
    captionTextarea.value = caption.text;
    captionEditor.querySelector('.caption-editor-time').textContent = `${time(caption.start)} – ${time(caption.end)}`;
    captionEditor.querySelector('.caption-editor-count').textContent = `${captionTextarea.value.length} / 500`;
    captionEditor.querySelector('.caption-editor-preview-text').textContent = captionTextarea.value;
    captionEditor.querySelector('.caption-editor-error').textContent = '';
    captionEditor.hidden = false; requestAnimationFrame(() => { captionTextarea.focus(); captionTextarea.setSelectionRange(captionTextarea.value.length, captionTextarea.value.length); });
  }
  captionTextarea.addEventListener('input', () => {
    captionEditor.querySelector('.caption-editor-count').textContent = `${captionTextarea.value.length} / 500`;
    captionEditor.querySelector('.caption-editor-preview-text').textContent = captionTextarea.value || 'Lời bài hát sẽ hiển thị ở đây';
    captionEditor.querySelector('.caption-editor-error').textContent = '';
  });
  captionEditor.querySelector('.caption-editor-close').addEventListener('click', closeCaptionEditor);
  captionEditor.querySelector('.caption-editor-cancel').addEventListener('click', closeCaptionEditor);
  captionEditor.querySelector('.caption-editor-save').addEventListener('click', saveCaptionEditor);
  captionEditor.addEventListener('click', event => { if (event.target === captionEditor) closeCaptionEditor(); });
  captionEditor.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCaptionEditor(); } if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); saveCaptionEditor(); } });
  function activeCaptionIndex() {
    const t = currentTime();
    return captions.findIndex(c => t >= c.start && t < c.end);
  }
  function syncCaption() {
    const el = $('#captionPreview'); if (!captions.length) { el.style.display = 'none'; return; }
    const idx = activeCaptionIndex(); if (idx < 0 || !captions[idx]) { el.style.display = 'none'; return; }
    const current = captions[idx]; const text=current.text.replace(/[\r\n]+/g,' ').trim();
    if (el.textContent !== text) el.textContent = text;
    el.style.display = 'block'; el.classList.remove('top','center','bottom'); el.classList.add($('#positionSelect').value);
    const baseSize = Number($('#fontSize').value) || 32; const stageWidth = $('#previewStage').clientWidth * .84;
    const fontFamily=$('#fontSelect').value || 'Arial,sans-serif'; const fitKey=`${idx}|${text}|${baseSize}|${fontFamily}|${stageWidth}`;
    if (el.dataset.fitKey !== fitKey) {
      const measureCanvas = syncCaption.measureCanvas || (syncCaption.measureCanvas = document.createElement('canvas'));
      const measureContext = measureCanvas.getContext('2d');
      if (measureContext) {
        measureContext.font = `800 ${baseSize}px ${fontFamily}`;
        const measuredWidth = measureContext.measureText(text).width;
        const fittedSize = measuredWidth > stageWidth && measuredWidth > 0 ? baseSize * stageWidth / measuredWidth : baseSize;
        el.style.fontSize = `${Math.max(12, Math.min(baseSize, fittedSize))}px`;
      }
      el.dataset.fitKey=fitKey;
    }
  }
  function syncInspectorVisibility() { const hasStyleTarget=Boolean(captions.length||textOverlays.length);$('#inspectorEmpty').style.display=hasStyleTarget?'none':'flex';$('#inspectorControls').style.display=hasStyleTarget?'block':'none'; }
  function syncInspector() { const sample = $('#sampleText'); const overlay=textOverlays[selectedText]; const caption=captions[selectedCaption]||(!overlay?captions[0]:null); const text=overlay?.text||caption?.text;if(text)sample.textContent=text;syncInspectorVisibility(); }
  $('#modalGenerate').addEventListener('click', async () => {
    if (!asrFile) { showToast('Chọn tệp âm thanh hoặc video trước'); return; }
    const button = $('#modalGenerate'); const label = $('#asrButtonText'); const status = $('#asrStatus');
    const progress = $('#transcribeProgress'); const progressFill = $('#progressFill');
    const progressPercent = $('#progressPercent'); const progressMessage = $('#progressMessage');
    let lastProgress = 1;
    const updateProgress = (value, message) => { const percent = Math.max(lastProgress, Math.max(1, Math.min(100, Math.round(Number(value) || 1)))); lastProgress=percent; progressFill.style.width = `${percent}%`; progressPercent.textContent = `${percent}%`; if (message) progressMessage.textContent = message; };
    button.disabled = true; progress.hidden = false; updateProgress(1, 'Đang gửi tệp lên server');
    label.textContent = 'Đang nhận diện…'; status.textContent = 'Đang tải tệp lên, sau đó căn lời theo từng đoạn âm thanh.';
    try {
      const form = new FormData(); form.append('file', asrFile, asrFile.name); form.append('language', $('#languageSelect').value); form.append('hints', $('#recognitionHints').value.trim());
      const response = await new Promise((resolve,reject) => {
        const xhr=new XMLHttpRequest(); xhr.open('POST',`${asrBase}?action=transcribe`); xhr.timeout=1800000;
        xhr.upload.addEventListener('progress',event => { if(event.lengthComputable){const percent=1+(event.loaded/event.total)*5;updateProgress(percent,`Đang tải tệp lên server · ${Math.round(event.loaded/event.total*100)}%`);} });
        xhr.addEventListener('load',() => {let data={};try{data=JSON.parse(xhr.responseText);}catch{} resolve({ok:xhr.status>=200&&xhr.status<300,status:xhr.status,data});});
        xhr.addEventListener('error',() => reject(new Error('Mất kết nối khi tải tệp lên server.')));
        xhr.addEventListener('timeout',() => reject(new Error('Tải tệp lên quá thời gian chờ.')));
        xhr.addEventListener('abort',() => reject(new Error('Đã hủy tải tệp lên server.')));
        xhr.send(form);
      });
      const data=response.data;
      if (!response.ok) throw new Error(data.error || `Lỗi nhận dạng (${response.status})`);
      if (!data.job_id) throw new Error('Server không trả về mã tác vụ nhận dạng.');
      let result;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const progressResponse = await fetch(`${asrBase}?action=progress&job_id=${encodeURIComponent(data.job_id)}`, {cache:'no-store'});
        const job = await progressResponse.json().catch(() => ({}));
        if (!progressResponse.ok) throw new Error(job.error || `Không đọc được tiến độ (${progressResponse.status})`);
        updateProgress(job.progress, job.message);
        if (job.status === 'error') throw new Error(job.error || job.message || 'Nhận dạng thất bại.');
        if (job.status === 'done') { result = job; break; }
      }
      const dataResult = result;
      if (!Array.isArray(dataResult.segments) || !dataResult.segments.length) throw new Error('Không tách được lời rõ ràng. Chọn đúng ngôn ngữ và thử đoạn thu ít nhạc nền hơn.');
      captions = dataResult.segments.map(segment => ({text:segment.text.trim(), start:Number(segment.start), end:Number(segment.end)})).filter(segment => segment.text && segment.end > segment.start);
      if (!captions.length) throw new Error('Mô hình không tìm thấy lời bài hát rõ ràng.');
      selectedCaption = 0; selectedText=-1;
      renderCaptions(); syncInspector(); seek(captions[0].start); syncCaption();
      const languageProbability=Number(dataResult.language_probability);
      const confidence = Number.isFinite(languageProbability) ? ` · xác suất ngôn ngữ ${Math.round(languageProbability * 100)}%` : '';
      const detectedLanguage = dataResult.language || 'tự nhận diện';
      const lowLanguageConfidence=Number.isFinite(languageProbability)&&languageProbability<.55;
      status.textContent = `Đã nhận dạng ${detectedLanguage}${confidence}. ${lowLanguageConfidence?'Ngôn ngữ chưa chắc; hãy chọn Tiếng Việt (vi) và thêm vài từ gợi ý rồi nhận diện lại. ':' '}Kiểm tra lại lời và mốc thời gian trước khi xuất.`;
      updateProgress(100, 'Hoàn tất');
      await new Promise(resolve => setTimeout(resolve, 600));
      modal.classList.remove('open');
      showToast(`Đã nhận ${captions.length} đoạn · ${detectedLanguage}${confidence}`);
    } catch (error) { status.textContent = error.message; showToast(error.message); }
    finally { button.disabled = false; label.textContent = 'Nhận diện trên server'; }
  });
  $('#fontSize').addEventListener('input', (e) => { const size = `${e.target.value}px`; $('#fontSizeValue').textContent = `${e.target.value} px`; $('#captionPreview').style.fontSize = size; $('#sampleText').style.fontSize = `${Math.round(Number(e.target.value) / 2)}px`; syncCaption(); syncTextOverlay(currentTime()); });
  $('#textColor').addEventListener('input', (e) => { applyColor(e.target.value); syncTextOverlay(currentTime()); });
  document.querySelectorAll('.color-chip').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.color-chip').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); $('#textColor').value = btn.dataset.color; applyColor(btn.dataset.color); syncTextOverlay(currentTime()); }));
  function applyColor(color) { $('#captionPreview').style.color = color; $('#sampleText').style.color = color; }
  $('#fontSelect').addEventListener('change', e => { $('#captionPreview').style.fontFamily = e.target.value; $('#sampleText').style.fontFamily = e.target.value; syncCaption(); syncTextOverlay(currentTime()); });
  $('#positionSelect').addEventListener('change', syncCaption);
  $('#strokeToggle').addEventListener('click', (e) => { e.currentTarget.classList.toggle('on'); const on = e.currentTarget.classList.contains('on'); $('#captionPreview').style.textShadow = on ? '0 2px 3px #000,2px 3px 4px #000' : 'none'; $('#sampleText').style.textShadow = on ? '0 2px 4px #000' : 'none'; syncTextOverlay(currentTime()); });
  document.querySelectorAll('.preset').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const p = btn.dataset.preset; if (p === 'karaoke') applyColor('#ffe268'); else if (p === 'soft') { applyColor('#ffffff'); $('#captionPreview').style.textShadow = '0 0 10px #a78bfa,0 2px 3px #000'; } else { applyColor('#ffffff'); $('#captionPreview').style.textShadow = '0 2px 3px #000,2px 3px 4px #000'; }
    $('#textColor').value = p === 'karaoke' ? '#ffe268' : '#ffffff';
    syncTextOverlay(currentTime());
  }));
  document.querySelectorAll('.rail-item').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.rail-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const panel = btn.dataset.panel;
    const content = { media:['Phương tiện','Tải video và âm thanh của bạn lên'], captions:['Phụ đề','Tạo và chỉnh sửa lời bài hát'], audio:['Âm thanh','Quản lý nhạc và âm thanh'], text:['Văn bản','Kiểu chữ cho video'] }[panel];
    if (content) { $('#panelTitle').textContent = content[0]; $('#panelSub').textContent = content[1]; }
    if (panel === 'captions') openModal(); else if (panel === 'audio') $('#audioInput').click(); else if (panel === 'text') openTextEditor();
  }));
  document.querySelectorAll('.timeline-tab').forEach((tab, i) => tab.addEventListener('click', () => { document.querySelectorAll('.timeline-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); if (i === 1) { openModal(); } }));
  const exportModal = $('#exportModal');
  const exportResolutions = { '720':{width:1280,height:720,bitrate:8000000}, '1080':{width:1920,height:1080,bitrate:16000000}, '2160':{width:3840,height:2160,bitrate:38000000} };
  let exportSession = null;
  function selectedExportResolution() { return $('input[name="exportResolution"]:checked')?.value || '1080'; }
  function updateExportSummary() {
    const choice = selectedExportResolution(); const preset = exportResolutions[choice];
    $('#exportDuration').textContent = time(duration);
    $('#exportEstimate').textContent = `${Math.max(1, Math.round(preset.bitrate * duration / 8 / 1024 / 1024))} MB`;
    exportModal.querySelectorAll('.export-resolution').forEach(label => label.classList.toggle('selected', label.querySelector('input').checked));
  }
  document.querySelectorAll('input[name="exportResolution"]').forEach(input => input.addEventListener('change', updateExportSummary));
  function openExportModal() {
    if (exportSession) return;
    updateExportSummary(); $('#exportProgress').hidden = true; $('#exportProgressFill').style.width = '0%';
    $('#exportProgressPercent').textContent = '0%'; $('#exportProgressMessage').textContent = 'Sẵn sàng xuất video';
    $('#exportStart').disabled = false; $('#exportCancel').disabled = false; $('#exportCancel').textContent = 'Đóng'; $('#exportClose').disabled = false;
    const hasTimelineMedia = Boolean(mediaClips.visual || mediaClips.audio || captions.length || textOverlays.length);
    $('#exportStart').disabled = !hasTimelineMedia;
    exportModal.querySelector('.export-note span:last-child').textContent = hasTimelineMedia
      ? 'Video được dựng ngay trong trình duyệt và tải về dạng WebM. 4K cần nhiều tài nguyên; thời gian xuất thường gần bằng thời lượng video.'
      : 'Thêm ảnh, video, nhạc hoặc lyrics vào timeline trước khi xuất video.';
    exportModal.hidden = false;
  }
  function cancelOrCloseExport() {
    if (!exportSession) { exportModal.hidden = true; return; }
    exportSession.cancelled = true;
    if (exportSession.recorder?.state === 'recording') exportSession.recorder.stop();
    $('#exportProgressMessage').textContent = 'Đang dừng quá trình xuất…'; $('#exportCancel').disabled = true;
  }
  $('#exportBtn').addEventListener('click', openExportModal);
  $('#exportClose').addEventListener('click', cancelOrCloseExport);
  $('#exportCancel').addEventListener('click', cancelOrCloseExport);
  exportModal.addEventListener('click', event => { if (event.target === exportModal) cancelOrCloseExport(); });
  exportModal.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelOrCloseExport(); } });
  async function exportVideoFile() {
    if (exportSession || (!mediaClips.visual && !mediaClips.audio && !captions.length && !textOverlays.length)) return;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { showToast('Trình duyệt này chưa hỗ trợ xuất video. Hãy dùng Chrome hoặc Edge mới.'); return; }
    const session = {cancelled:false, recorder:null}; exportSession = session;
    const startButton = $('#exportStart'); const cancelButton = $('#exportCancel'); const closeButton = $('#exportClose');
    const progressBox = $('#exportProgress'); const progressFill = $('#exportProgressFill'); const progressPercent = $('#exportProgressPercent'); const progressMessage = $('#exportProgressMessage');
    startButton.disabled = true; cancelButton.textContent = 'Dừng xuất'; closeButton.disabled = true; progressBox.hidden = false;
    document.querySelectorAll('input[name="exportResolution"]').forEach(input => { input.disabled=true; });
    const updateProgress = (percent, message) => { const p = Math.max(0, Math.min(100, Math.round(percent))); progressFill.style.width = `${p}%`; progressPercent.textContent = `${p}%`; if (message) progressMessage.textContent = message; };
    updateProgress(1, 'Đang chuẩn bị khung hình và âm thanh');
    let canvasStream = null; let audioContext = null; let animationFrame = 0; let progressTimer = 0;
    const mediaElements = []; const mediaStreams = [];
    try {
      const preset = exportResolutions[selectedExportResolution()]; const canvas = document.createElement('canvas');
      canvas.width = preset.width; canvas.height = preset.height;
      const ctx = canvas.getContext('2d', {alpha:false}); if (!ctx) throw new Error('Không khởi tạo được bộ dựng khung hình.');
      const visualClip = mediaClips.visual; const audioClip = mediaClips.audio;
      const visualAsset = visualClip && assets.find(asset => asset.id === visualClip.assetId);
      const audioAsset = audioClip && assets.find(asset => asset.id === audioClip.assetId);
      let stillImage = null; let sourceVideo = null; let sourceAudio = null; let videoGain = null; let audioGain = null; let audioDestination = null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if ((visualAsset?.kind === 'video' || audioAsset) && !AudioContextClass) throw new Error('Trình duyệt thiếu AudioContext nên không thể ghép âm thanh vào video xuất. Hãy dùng Chrome hoặc Edge mới.');
      if ((visualAsset?.kind === 'video' || audioAsset) && AudioContextClass) {
        audioContext = new AudioContextClass(); audioDestination = audioContext.createMediaStreamDestination();
        audioContext.resume().catch(() => {});
      }
      if (visualAsset?.kind === 'image') {
        stillImage = new Image(); stillImage.src = visualAsset.url;
        if (stillImage.decode) await stillImage.decode(); else await new Promise((resolve,reject) => { stillImage.onload=resolve; stillImage.onerror=reject; });
      } else if (visualAsset?.kind === 'video') {
        sourceVideo = document.createElement('video'); sourceVideo.preload='auto'; sourceVideo.playsInline=true; sourceVideo.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; sourceVideo.src=visualAsset.url; document.body.append(sourceVideo); mediaElements.push(sourceVideo);
        if (audioContext) { const node=audioContext.createMediaElementSource(sourceVideo); videoGain=audioContext.createGain(); videoGain.gain.value=0; node.connect(videoGain).connect(audioDestination); }
        const videoPlay = sourceVideo.play().catch(() => {});
        await new Promise((resolve,reject) => { if (sourceVideo.readyState >= 1) return resolve(); sourceVideo.addEventListener('loadedmetadata',resolve,{once:true}); sourceVideo.addEventListener('error',()=>reject(new Error('Không đọc được video nguồn.')),{once:true}); });
        sourceVideo.currentTime = Math.min(visualClip.start, Math.max(0, (sourceVideo.duration || visualClip.start) - .05)); await videoPlay;
      }
      if (audioAsset) {
        sourceAudio = document.createElement('audio'); sourceAudio.preload='auto'; sourceAudio.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; sourceAudio.src=audioAsset.url; document.body.append(sourceAudio); mediaElements.push(sourceAudio);
        if (audioContext) { const node=audioContext.createMediaElementSource(sourceAudio); audioGain=audioContext.createGain(); audioGain.gain.value=0; node.connect(audioGain).connect(audioDestination); }
        const audioPlay = sourceAudio.play().catch(() => {});
        await new Promise((resolve,reject) => { if (sourceAudio.readyState >= 1) return resolve(); sourceAudio.addEventListener('loadedmetadata',resolve,{once:true}); sourceAudio.addEventListener('error',()=>reject(new Error('Không đọc được âm thanh nguồn.')),{once:true}); });
        sourceAudio.currentTime = Math.min(audioClip.start, Math.max(0, (sourceAudio.duration || audioClip.start) - .05)); await audioPlay;
      }
      if (session.cancelled) throw new Error('Đã hủy xuất video.');
      if (audioContext) { await audioContext.resume().catch(()=>{}); if (audioContext.state !== 'running') throw new Error('Không khởi động được bộ trộn âm thanh của trình duyệt.'); }
      if (document.fonts?.ready) await document.fonts.ready;
      const mimeTypes = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Trình duyệt không hỗ trợ định dạng WebM cần thiết để xuất video.');
      canvasStream = canvas.captureStream(30); mediaStreams.push(canvasStream);
      if (audioDestination) { const audioStream=audioDestination.stream; mediaStreams.push(audioStream); audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track)); }
      const recorder = new MediaRecorder(canvasStream,{mimeType,videoBitsPerSecond:preset.bitrate,audioBitsPerSecond:192000}); session.recorder=recorder;
      const chunks=[]; let recorderError=null;
      const stopped = new Promise(resolve => {
        recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        recorder.onerror = event => { recorderError=event.error || new Error('Lỗi khi mã hóa video.'); try { if (recorder.state==='recording') recorder.stop(); } catch {} };
        recorder.onstop = () => resolve(new Blob(chunks,{type:recorder.mimeType || mimeType}));
      });
      const stageHeight = Math.max(1,$('#previewStage').getBoundingClientRect().height);
      const baseFontSize = Number($('#fontSize').value) || 32;
      const fontFamily = $('#fontSelect').value || 'Arial,sans-serif'; const textColor=$('#textColor').value || '#ffffff';
      const fontScale = canvas.height / stageHeight; const maxTextWidth=canvas.width*.88;
      function drawContained(source) {
        const sw=source.videoWidth || source.naturalWidth; const sh=source.videoHeight || source.naturalHeight;
        if (!sw || !sh) return;
        const scale=Math.min(canvas.width/sw,canvas.height/sh); const w=sw*scale; const h=sh*scale;
        ctx.drawImage(source,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      }
      function drawLyrics(t) {
        const idx=captions.findIndex(c => t>=c.start && t<c.end); if (idx<0) return;
        const current=captions[idx];
        const lines=[{text:current.text.replace(/[\r\n]+/g,' ').trim(),size:baseFontSize}];
        const scale=fontScale; const gap=4*scale; const rowHeights=lines.map(line=>line.size*scale*1.3); const totalHeight=rowHeights.reduce((sum,height)=>sum+height,0)+gap*(lines.length-1);
        const position=$('#positionSelect').value; let top=position==='top'?canvas.height*.09:position==='center'?(canvas.height-totalHeight)/2:canvas.height*.9-totalHeight;
        const stroke=$('#strokeToggle').classList.contains('on'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
        for (let i=0;i<lines.length;i++) {
          const line=lines[i]; const size=line.size*scale; const y=top+rowHeights[i]/2;
          ctx.font=`800 ${size}px ${fontFamily}`; ctx.fillStyle=textColor;
          if (stroke) { ctx.lineWidth=Math.max(2*scale,size*.09); ctx.strokeStyle='rgba(0,0,0,.92)'; ctx.strokeText(line.text,canvas.width/2,y,maxTextWidth); }
          ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=3*scale; ctx.shadowOffsetY=2*scale; ctx.fillText(line.text,canvas.width/2,y,maxTextWidth); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
          top+=rowHeights[i]+gap;
        }
      }
      function drawTextOverlays(t) {
        const active=textOverlays.filter(item=>t>=item.start&&t<item.end); if(!active.length) return;
        const size=Math.max(16,baseFontSize*.8)*fontScale; const lineHeight=size*1.35; let y=canvas.height*.13;
        const strokeEnabled=$('#strokeToggle').classList.contains('on');
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.font=`800 ${size}px ${fontFamily}`;ctx.fillStyle=textColor;
        for(const item of active){const text=item.text.replace(/[\r\n]+/g,' ').trim();
          if(strokeEnabled){ctx.lineWidth=Math.max(2*fontScale,size*.09);ctx.strokeStyle='rgba(0,0,0,.92)';ctx.strokeText(text,canvas.width/2,y,maxTextWidth);}
          ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=3*fontScale;ctx.shadowOffsetY=2*fontScale;ctx.fillText(text,canvas.width/2,y,maxTextWidth);ctx.shadowBlur=0;ctx.shadowOffsetY=0;y+=lineHeight;
        }
      }
      function drawFrame(t) {
        ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
        const visualActive=visualClip && t>=visualClip.start && t<visualClip.end;
        if (visualActive) {
          if (stillImage) drawContained(stillImage);
          else if (sourceVideo?.readyState>=2) {
            if (sourceVideo.paused) sourceVideo.play().catch(()=>{});
            if (sourceVideo.currentTime < t-.45 || sourceVideo.currentTime > t+.45) { try { sourceVideo.currentTime=Math.min(t,sourceVideo.duration||t); } catch {} }
            drawContained(sourceVideo);
          }
        } else if (sourceVideo && !sourceVideo.paused) sourceVideo.pause();
        if (videoGain) videoGain.gain.setTargetAtTime(visualActive ? 1 : 0,audioContext.currentTime,.015);
        if (audioGain) {
          const playing=audioClip && t>=audioClip.start && t<audioClip.end;
          if (playing && sourceAudio.paused) { try { sourceAudio.currentTime=Math.min(t,sourceAudio.duration||t); sourceAudio.play().catch(()=>{}); } catch {} }
          if (!playing && !sourceAudio.paused) sourceAudio.pause();
          if (playing && Math.abs(sourceAudio.currentTime-t)>.45) { try { sourceAudio.currentTime=Math.min(t,sourceAudio.duration||t); } catch {} }
          audioGain.gain.setTargetAtTime(playing?1:0,audioContext.currentTime,.015);
        }
        drawLyrics(t); drawTextOverlays(t);
      }
      const startedAt=performance.now();
      recorder.start(1000);
      const render=(now) => {
        if (session.cancelled || recorder.state!=='recording') return;
        const elapsed=(now-startedAt)/1000; const t=Math.min(duration,elapsed); drawFrame(t);
        updateProgress(Math.min(99,t/Math.max(1,duration)*100),selectedExportResolution()==='2160'?'Đang dựng video 4K…':'Đang dựng video…');
        if (elapsed>=duration) { recorder.stop(); return; }
        animationFrame=requestAnimationFrame(render);
      };
      progressTimer=setInterval(() => { if (recorder.state==='recording') updateProgress(Math.min(99,(performance.now()-startedAt)/1000/Math.max(1,duration)*100),selectedExportResolution()==='2160'?'Đang dựng video 4K…':'Đang dựng video…'); },250);
      drawFrame(0); animationFrame=requestAnimationFrame(render);
      const blob=await stopped;
      if (recorderError) throw recorderError;
      if (session.cancelled) { updateProgress(0,'Đã hủy xuất video'); return; }
      if (!blob.size) throw new Error('Tệp xuất rỗng. Hãy thử lại với độ phân giải thấp hơn.');
      updateProgress(100,'Đang chuẩn bị tải xuống');
      const safeTitle=($('#projectTitle').textContent||'lyriccut-video').replace(/[<>:"/\\|?*]+/g,'-').trim() || 'lyriccut-video';
      const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`${safeTitle}-${selectedExportResolution()}p.webm`; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
      progressMessage.textContent=`Xuất xong · ${(blob.size/1024/1024).toFixed(1)} MB`;
      showToast('Video đã xuất và tải xuống');
    } catch (error) {
      if (session.cancelled) updateProgress(0,'Đã hủy xuất video');
      else { progressMessage.textContent=error.message || 'Xuất video thất bại'; showToast(progressMessage.textContent); }
    } finally {
      cancelAnimationFrame(animationFrame); clearInterval(progressTimer);
      const recorder=session.recorder; if (recorder?.state==='recording') { try { recorder.stop(); } catch {} }
      mediaElements.forEach(element => { element.pause(); element.removeAttribute('src'); element.load(); element.remove(); });
      mediaStreams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      if (audioContext && audioContext.state!=='closed') await audioContext.close().catch(()=>{});
      exportSession=null; startButton.disabled=false; cancelButton.disabled=false; cancelButton.textContent='Đóng'; closeButton.disabled=false;
      document.querySelectorAll('input[name="exportResolution"]').forEach(input => { input.disabled=false; });
    }
  }
  $('#exportStart').addEventListener('click', exportVideoFile);
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#playBtn').click(); } if (e.key === 'Escape') modal.classList.remove('open'); });

  const contextMenu = document.createElement('div'); contextMenu.className = 'context-menu'; contextMenu.hidden = true; document.body.append(contextMenu);
  function hideContextMenu() { contextMenu.hidden = true; }
  function removeAsset(asset) {
    if (!asset) return;
    asset.item?.remove(); assets = assets.filter(a => a.id !== asset.id);
    if (asset.kind === 'audio' && audioUrl === asset.url) { audio.pause(); audio.removeAttribute('src'); audio.load(); audioUrl = ''; mediaClips.audio = null; if (mediaClips.visual?.type === 'image' && mediaClips.visual.autoFitAudio) mediaClips.visual.end = 30; }
    if (activeMedia?.id === asset.id) {
      if (asset.kind === 'video') { video.pause(); video.removeAttribute('src'); video.load(); mediaUrl = ''; }
      if (asset.kind === 'image') { image.removeAttribute('src'); image.style.display = 'none'; }
      activeMedia = null;
      if (!activeMedia) $('#welcome').style.display = 'block';
      mediaClips.visual = null;
    }
    updateTimelineDuration(); $('#assetCount').textContent = assets.length;
    if (!assets.length) $('#assetList').innerHTML = '<div class="empty-assets"><span>▱</span><p>Chưa có tệp nào</p><small>Tệp bạn tải lên sẽ xuất hiện ở đây</small></div>';
    URL.revokeObjectURL(asset.url); showToast('Đã xóa tệp khỏi dự án');
  }
  function showMenu(event, entries) {
    contextMenu.replaceChildren();
    entries.forEach(({label, action, danger}) => { const button = document.createElement('button'); button.textContent = label; if (danger) button.classList.add('danger'); button.addEventListener('click', () => { hideContextMenu(); action(); }); contextMenu.append(button); });
    contextMenu.hidden = false; const x = Math.min(event.clientX, innerWidth - 190); const y = Math.min(event.clientY, innerHeight - entries.length * 36 - 10); contextMenu.style.left = `${Math.max(5,x)}px`; contextMenu.style.top = `${Math.max(5,y)}px`;
  }
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const assetItem = event.target.closest('.asset-item');
    const clip = event.target.closest('.media-clip');
    if (clip?.dataset.textIndex !== undefined) {
      const index=Number(clip.dataset.textIndex); const item=textOverlays[index]; if(!item) return;
      showMenu(event,[
        {label:'✎  Sửa văn bản',action:()=>openTextEditor(index)},
        {label:'⧉  Nhân bản văn bản',action:()=>{const length=item.end-item.start;textOverlays.splice(index+1,0,{...item,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,start:item.end+.1,end:item.end+length+.1});selectedText=index+1;selectedCaption=-1;updateTimelineDuration();renderTextTrack();syncInspector();}},
        {label:'⌫  Xóa văn bản',danger:true,action:()=>{textOverlays.splice(index,1);selectedText=textOverlays.length?Math.min(index,textOverlays.length-1):-1;updateTimelineDuration();renderTextTrack();syncInspector();syncTextOverlay(currentTime());}}
      ]);
      return;
    }
    if (clip?.dataset.captionIndex !== undefined) {
      const index = Number(clip.dataset.captionIndex); const caption = captions[index];
      showMenu(event, [
        {label:'✎  Sửa lời', action:() => openCaptionEditor(index)},
        {label:'⧉  Nhân bản câu', action:() => { captions.splice(index+1,0,{...caption,start:caption.end+.1,end:caption.end+(caption.end-caption.start)+.1}); selectedCaption=index+1;renderCaptions();syncInspector(); }},
        {label:'⌫  Xóa câu', danger:true, action:() => { captions.splice(index,1);selectedCaption=captions.length?Math.min(index,captions.length-1):-1;renderCaptions();syncCaption();syncInspector(); }}
      ]);
      return;
    }
    const id = assetItem?.dataset.assetId || clip?.dataset.assetId; const asset = assets.find(a => a.id === id);
    if (!asset) {
      showMenu(event, [
        {label:'＋  Thêm tệp vào dự án',action:() => $('#mediaInput').click()},
        {label:'✦  Tạo phụ đề lyrics',action:openModal},
        {label:`${video.src && !video.paused || audio.src && !audio.paused || imagePlaying ? 'Ⅱ  Tạm dừng' : '▶  Phát'} video`,action:togglePlayback}
      ]);
      return;
    }
    showMenu(event, [
      {label:'▶  Mở xem trước',action:() => { if(asset.kind==='video'){activeMedia=asset;video.src=asset.url;video.style.display='block';image.style.display='none';$('#welcome').style.display='none';} else if(asset.kind==='image'){loadAssetPreview(asset);} else {audio.src=asset.url;audioUrl=asset.url;} }},
      {label:'⧉  Nhân bản vào timeline',action:() => loadMedia(asset.file)},
      {label:'⌫  Xóa khỏi dự án',danger:true,action:() => removeAsset(asset)}
    ]);
  });
  function loadAssetPreview(asset) { if(asset.kind==='image'){activeMedia=asset;image.src=asset.url;image.style.display='block';video.style.display='none';$('#welcome').style.display='none';} else if(asset.kind==='video'){activeMedia=asset;video.src=asset.url;video.style.display='block';image.style.display='none';$('#welcome').style.display='none';} }
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('scroll', hideContextMenu, true);
  const stage = $('#previewStage');
  stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('drag-over'); });
  stage.addEventListener('dragleave', (e) => { if (!stage.contains(e.relatedTarget)) stage.classList.remove('drag-over'); });
  stage.addEventListener('drop', (e) => { e.preventDefault(); stage.classList.remove('drag-over'); [...(e.dataTransfer?.files || [])].forEach(loadMedia); });
  renderCaptions(); renderTextTrack();
})();
