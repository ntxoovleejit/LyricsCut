<?php
require_once __DIR__ . '/seo-config.php';
$seo = lyriccut_seo_context('/');
$pageTitle = 'Phần mềm chỉnh sửa video và tạo phụ đề lời bài hát | LyricCut Studio';
$pageDescription = 'Chỉnh sửa video trên timeline, ghép ảnh và nhạc, tạo phụ đề lyrics theo thời gian bằng mô hình tự host. Tuỳ chỉnh font, màu chữ và xuất video 720p, 1080p hoặc 4K.';
$canonical = htmlspecialchars($seo['canonical'], ENT_QUOTES, 'UTF-8');
$siteBase = htmlspecialchars($seo['base'], ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101113">
  <script>try{const savedTheme=localStorage.getItem('lyriccut-theme');if(savedTheme==='light'||savedTheme==='dark')document.documentElement.dataset.theme=savedTheme;}catch{}</script>
  <meta name="description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>">
  <meta name="robots" content="<?= htmlspecialchars($seo['robots'], ENT_QUOTES, 'UTF-8') ?>">
  <link rel="canonical" href="<?= $canonical ?>">
  <link rel="icon" href="<?= $siteBase ?>/assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate" hreflang="vi-VN" href="<?= $canonical ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="LyricCut Studio">
  <meta property="og:title" content="<?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?>">
  <meta property="og:description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>">
  <meta property="og:url" content="<?= $canonical ?>">
  <meta name="twitter:card" content="summary">
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
  <script type="application/ld+json">
    <?= json_encode([
      '@context' => 'https://schema.org',
      '@graph' => [
        ['@type' => 'WebSite', '@id' => $seo['canonical'] . '#website', 'url' => $seo['canonical'], 'name' => 'LyricCut Studio', 'inLanguage' => 'vi-VN'],
        ['@type' => 'WebPage', '@id' => $seo['canonical'] . '#webpage', 'url' => $seo['canonical'], 'name' => $pageTitle, 'description' => $pageDescription, 'inLanguage' => 'vi-VN', 'isPartOf' => ['@id' => $seo['canonical'] . '#website']],
      ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>
  </script>
  <link rel="stylesheet" href="assets/style.css?v=20261112-zoom-green">
  <link rel="stylesheet" href="assets/theme.css?v=20261112-help-popup">
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="LyricCut Studio"><span class="brand-mark"><i></i><i></i><i></i></span><span>lyriccut</span></a>
      <div class="project-name"><span class="dot"></span><span id="projectTitle">Dự án chưa đặt tên</span><button class="icon-btn rename" id="renameProject" aria-label="Đổi tên dự án">✎</button></div>
      <div class="top-actions"><span class="autosave"><span class="save-dot"></span> Đã lưu</span><button class="theme-toggle" id="themeToggle" type="button" aria-label="Bật giao diện sáng" title="Bật giao diện sáng">☼</button><button class="btn btn-quiet" id="exportBtn"><span>↗</span> Xuất</button><button class="avatar" aria-label="Tài khoản">N</button></div>
    </header>

    <main class="workspace">
      <aside class="rail" aria-label="Công cụ">
        <button class="rail-item active" data-panel="media"><span class="rail-icon">▧</span><span>Phương tiện</span></button>
        <button class="rail-item" data-panel="captions"><span class="rail-icon">T</span><span>Phụ đề</span></button>
        <button class="rail-item" data-panel="audio"><span class="rail-icon">♫</span><span>Âm thanh</span></button>
        <button class="rail-item" data-panel="text"><span class="rail-icon">Aa</span><span>Văn bản</span></button>
        <div class="rail-spacer"></div><button class="rail-item help" id="helpButton" type="button" aria-haspopup="dialog" aria-controls="helpModal"><span class="rail-icon">?</span><span>Trợ giúp</span></button>
      </aside>

      <section class="library-panel" id="libraryPanel">
        <div class="panel-heading"><div><h2 id="panelTitle">Phương tiện</h2><p id="panelSub">Tải video và âm thanh của bạn lên</p></div><button class="more-btn" aria-label="Tuỳ chọn">•••</button></div>
        <label class="upload-card" for="mediaInput"><span class="upload-icon">↑</span><b>Tải lên</b><span>Video, âm thanh hoặc hình ảnh</span><small>MP4 · MOV · MP3 · WAV</small></label>
        <input id="mediaInput" type="file" accept="video/*,audio/*,image/*" hidden>
        <div class="section-label"><span>TỆP DỰ ÁN</span><span id="assetCount">0</span></div>
        <div id="assetList" class="asset-list"><div class="empty-assets"><span>▱</span><p>Chưa có tệp nào</p><small>Tệp bạn tải lên sẽ xuất hiện ở đây</small></div></div>
        <div class="ai-card"><div class="ai-card-top"><span class="sparkle">✦</span><span>TRỢ LÝ LYRICS</span><span class="beta">BETA</span></div><h3>Biến giai điệu thành câu chữ</h3><p>Tạo phụ đề theo lời bài hát và tinh chỉnh từng câu ngay trên timeline.</p><button class="ai-button" id="generateBtn"><span>✦</span> Tạo phụ đề lyrics <span>→</span></button></div>
      </section>

      <section class="editor-area">
        <div class="editor-toolbar"><div class="breadcrumbs"><span>Không gian của tôi</span><span class="crumb-sep">/</span><b id="crumbProject">Dự án chưa đặt tên</b></div><div class="toolbar-right"><button class="tool-btn" title="Hoàn tác">↶</button><button class="tool-btn" title="Làm lại">↷</button><span class="toolbar-divider"></span><button class="zoom-btn">−</button><span class="zoom-value">100%</span><button class="zoom-btn">+</button></div></div>
        <div class="preview-wrap">
          <div class="preview-stage" id="previewStage">
            <div class="preview-grid"></div>
            <div class="welcome" id="welcome"><div class="welcome-orb"><span>▶</span></div><h2>Bắt đầu câu chuyện của bạn</h2><p>Tải video lên hoặc kéo tệp vào đây</p><label for="mediaInput" class="btn btn-primary">↑ &nbsp; Chọn video</label></div>
            <video id="videoPreview" playsinline></video>
            <img id="imagePreview" alt="Xem trước hình ảnh">
            <div class="caption-preview" id="captionPreview"></div>
            <div class="text-overlay-preview" id="textOverlayPreview"></div>
            <div class="preview-hud"><span class="hud-pill" id="previewBadge">XEM TRƯỚC</span><button class="hud-fullscreen" id="fullscreenBtn" title="Toàn màn hình">⛶</button></div>
          </div>
          <div class="playback"><span class="timecode" id="currentTime">00:00</span><div class="play-controls"><button class="skip-btn" id="backBtn" title="Lùi 5 giây">↶</button><button class="play-btn" id="playBtn" aria-label="Phát">▶</button><button class="skip-btn" id="forwardBtn" title="Tiến 5 giây">↷</button></div><span class="timecode muted" id="durationTime">00:00</span><button class="playback-fit">⛶</button></div>
        </div>
        <section class="timeline-panel">
          <div class="timeline-head"><div class="timeline-tabs"><button class="timeline-tab active">Chỉnh sửa</button><button class="timeline-tab">Lời bài hát <span class="count" id="captionCount">0</span></button></div><div class="timeline-actions"><button class="mini-action" title="Thu nhỏ timeline">−</button><input class="timeline-zoom-slider" id="timelineZoomControl" type="range" min="0" max="100" value="29" aria-label="Phóng to timeline" title="Kéo để phóng to tối đa 3200%"><button class="mini-action" title="Phóng to timeline">+</button><span class="toolbar-divider"></span><button class="mini-action" id="timelineExpandBtn" title="Mở timeline toàn màn hình" aria-label="Mở timeline toàn màn hình" aria-pressed="false">⛶</button></div></div>
          <div class="timeline-body" id="timelineBody"><div class="ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span><span>00:25</span><span>00:30</span></div><div class="track-row"><div class="track-label"><span class="track-icon video-track">▣</span><span>Video</span><button>⌄</button></div><div class="track-content" id="videoTrack"><div class="track-placeholder">Tải video lên để bắt đầu</div></div></div><div class="track-row"><div class="track-label"><span class="track-icon audio-track">♫</span><span>Âm thanh</span><button>⌄</button></div><div class="track-content" id="audioTrack"><div class="track-placeholder">Thêm nhạc hoặc âm thanh</div></div></div><div class="track-row caption-row"><div class="track-label"><span class="track-icon caption-track">T</span><span>Phụ đề</span><button>⌄</button></div><div class="track-content" id="captionTrack"><div class="track-placeholder">Lyrics của bạn sẽ nằm ở đây</div></div></div><div class="track-row text-row"><div class="track-label"><span class="track-icon text-track-icon">Aa</span><span>Văn bản</span><span class="count" id="textCount">0</span><button type="button" class="track-add-button" id="addTextBtn" title="Thêm văn bản">＋</button></div><div class="track-content" id="textTrack"><div class="track-placeholder">Văn bản bạn thêm sẽ nằm ở đây</div></div></div><div class="playhead" id="playhead"><span></span></div></div>
          <div class="timeline-footer"><span><i class="tiny-green"></i> 30 FPS</span><span>1080p</span><span class="timeline-hint">Kéo mép đoạn để chỉnh thời lượng · Nhấp đôi lời để sửa</span></div>
        </section>
      </section>

      <aside class="inspector" id="inspector"><div class="inspector-head"><div><h2>Kiểu phụ đề</h2><p>Tuỳ chỉnh giao diện lời bài hát</p></div><button class="more-btn">•••</button></div><div class="inspector-empty" id="inspectorEmpty"><div class="text-icon">T</div><b>Chưa chọn phụ đề</b><span>Tạo lời bài hát để bắt đầu chỉnh sửa kiểu chữ.</span></div><div class="inspector-controls" id="inspectorControls"><div class="style-preview"><span class="preview-sample" id="sampleText">Em nghe trong tim mình</span><small>XEM TRƯỚC</small></div><div class="control-group"><label for="fontSelect">Phông chữ</label><select id="fontSelect"><option value="'Be Vietnam Pro',sans-serif">Be Vietnam Pro · tiếng Việt</option><option value="'Noto Sans',sans-serif">Noto Sans</option><option value="Roboto,sans-serif">Roboto</option><option value="'DM Sans',sans-serif">DM Sans</option><option value="'Manrope',sans-serif">Manrope</option><option value="'Montserrat',sans-serif">Montserrat</option><option value="'Poppins',sans-serif">Poppins</option><option value="'Oswald',sans-serif">Oswald</option><option value="'Playfair Display',serif">Playfair Display</option><option value="'Bebas Neue',sans-serif">Bebas Neue</option><option value="Arial,sans-serif">Arial</option><option value="Georgia,serif">Georgia</option><option value="'Trebuchet MS',sans-serif">Trebuchet MS</option></select></div><div class="control-group"><div class="label-row"><label for="fontSize">Kích thước</label><span id="fontSizeValue">32 px</span></div><input type="range" id="fontSize" min="16" max="64" value="32"></div><div class="control-group"><label>Màu chữ</label><div class="color-row"><input type="color" id="textColor" value="#ffffff"><div class="color-presets"><button class="color-chip selected" data-color="#ffffff" style="--chip:#fff" aria-label="Trắng"></button><button class="color-chip" data-color="#ffe268" style="--chip:#ffe268" aria-label="Vàng"></button><button class="color-chip" data-color="#ff7294" style="--chip:#ff7294" aria-label="Hồng"></button><button class="color-chip" data-color="#81e6c1" style="--chip:#81e6c1" aria-label="Xanh mint"></button><button class="color-chip" data-color="#9ca6ff" style="--chip:#9ca6ff" aria-label="Tím"></button><button class="color-chip" data-color="#111318" style="--chip:#111318" aria-label="Đen"></button></div></div></div><div class="control-group"><label>Viền chữ</label><div class="toggle-row"><span>Tạo viền nổi bật</span><button class="toggle on" id="strokeToggle" aria-label="Bật viền"><i></i></button></div></div><div class="control-group"><label for="positionSelect">Vị trí</label><select id="positionSelect"><option value="bottom">Dưới cùng</option><option value="center">Ở giữa</option><option value="top">Trên cùng</option></select></div><div class="control-group"><label>Kiểu nhanh</label><div class="style-presets"><button class="preset active" data-preset="classic"><span class="preset-demo">Aa</span><small>Cơ bản</small></button><button class="preset" data-preset="karaoke"><span class="preset-demo karaoke-demo">Aa</span><small>Karaoke</small></button><button class="preset" data-preset="soft"><span class="preset-demo soft-demo">Aa</span><small>Mềm mại</small></button></div></div></div></aside>
    </main>
    <div class="export-backdrop" id="exportModal" hidden>
      <section class="export-dialog" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
        <header class="export-dialog-head"><div><span class="export-mark">↗</span><div><h2 id="exportTitle">Xuất video</h2><p>Chọn độ phân giải cho video của bạn</p></div></div><button type="button" class="export-close" id="exportClose" aria-label="Đóng">×</button></header>
        <div class="export-resolution-list" role="radiogroup" aria-label="Độ phân giải">
          <label class="export-resolution"><input type="radio" name="exportResolution" value="720"><span class="resolution-copy"><b>HD</b><small>720p · 1280 × 720</small></span><span class="resolution-check">✓</span></label>
          <label class="export-resolution selected"><input type="radio" name="exportResolution" value="1080" checked><span class="resolution-copy"><b>Full HD</b><small>1080p · 1920 × 1080</small></span><span class="resolution-check">✓</span></label>
          <label class="export-resolution"><input type="radio" name="exportResolution" value="2160"><span class="resolution-copy"><b>4K Ultra HD</b><small>2160p · 3840 × 2160</small></span><span class="resolution-check">✓</span></label>
        </div>
        <div class="export-summary"><span><small>Thời lượng</small><b id="exportDuration">00:00</b></span><span><small>Định dạng</small><b>WebM · 30 FPS</b></span><span><small>Dung lượng dự kiến</small><b id="exportEstimate">—</b></span></div>
        <div class="export-note"><span>ⓘ</span><span>Video được dựng ngay trong trình duyệt. 4K cần nhiều tài nguyên và có thể mất thời gian bằng thời lượng video.</span></div>
        <div class="export-progress" id="exportProgress" hidden><div class="export-progress-top"><span id="exportProgressMessage">Đang chuẩn bị</span><b id="exportProgressPercent">0%</b></div><div class="export-progress-track"><i id="exportProgressFill"></i></div></div>
        <footer class="export-actions"><button type="button" class="export-cancel" id="exportCancel">Đóng</button><button type="button" class="export-start" id="exportStart"><span>↗</span> Xuất video</button></footer>
      </section>
    </div>
    <div class="text-editor-backdrop" id="textModal" hidden>
      <section class="text-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="textEditorTitle">
        <header class="text-editor-head"><div><span class="text-editor-mark">Aa</span><div><h2 id="textEditorTitle">Thêm văn bản</h2><p>Đoạn chữ sẽ xuất hiện theo thời lượng trên timeline</p></div></div><button type="button" id="textModalClose" aria-label="Đóng">×</button></header>
        <label for="textOverlayInput">Nội dung</label><textarea id="textOverlayInput" maxlength="240" rows="4" placeholder="Nhập văn bản muốn hiển thị…"></textarea>
        <div class="text-editor-meta"><span id="textEditorTiming">Bắt đầu tại 00:00 · Thời lượng 4 giây</span><span id="textOverlayCount">0 / 240</span></div>
        <footer><button type="button" id="textModalCancel">Hủy</button><button type="button" id="textModalSave">Thêm văn bản</button></footer>
      </section>
    </div>
    <div class="help-backdrop" id="helpModal" hidden>
      <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="helpTitle" aria-describedby="helpDescription">
        <header class="help-dialog-head"><div class="help-dialog-mark" aria-hidden="true">?</div><div><h2 id="helpTitle">Trợ giúp & hỗ trợ</h2><p id="helpDescription">Liên hệ với LyricCut Studio nếu bạn cần hỗ trợ.</p></div><button class="help-close" id="helpClose" type="button" aria-label="Đóng cửa sổ trợ giúp">×</button></header>
        <a class="help-contact" href="mailto:ntxoovleejit@gmail.com"><span class="help-contact-icon" aria-hidden="true">✉</span><span><small>Email hỗ trợ</small><b>ntxoovleejit@gmail.com</b></span><span class="help-contact-arrow" aria-hidden="true">↗</span></a>
        <div class="help-product"><span class="help-product-dot"></span><span>LyricCut Studio · Trình chỉnh sửa video và phụ đề lyrics</span></div>
        <footer class="help-dialog-footer"><span>© <span id="helpCopyrightYear">2026</span> LyricCut Studio</span><span>Bản quyền thuộc về LyricCut Studio.</span></footer>
      </section>
    </div>
    <div class="toast" id="toast" role="status"></div>
    <div class="modal-backdrop" id="modal"><div class="modal"><button class="modal-close" id="closeModal">×</button><span class="modal-sparkle">✦</span><h2>Nhận diện lời bài hát</h2><p>Mô hình AI đa ngôn ngữ tự host trên máy chủ của bạn; không gửi tệp lên dịch vụ bên ngoài.</p><div class="modal-file" id="modalFile"><span>♫</span><div><b id="modalFileName">Chưa có tệp âm thanh</b><small>MP3, WAV, M4A hoặc video có âm thanh</small></div><label for="audioInput">Chọn tệp</label></div><input id="audioInput" type="file" accept="audio/*,video/*" hidden><div class="control-group language-picker"><label for="languageSelect">Ngôn ngữ bài hát</label><select id="languageSelect"><option value="">Tự nhận diện ngôn ngữ</option><option value="vi" selected>Tiếng Việt (vi)</option></select></div><div class="control-group recognition-hint-group"><label for="recognitionHints">Gợi ý để nhận diện tên riêng (không bắt buộc)</label><input id="recognitionHints" type="text" maxlength="240" placeholder="Tên bài hát, ca sĩ hoặc từ khó nghe…"><small>Ví dụ: tên người, địa danh hoặc vài từ bạn nghe được</small></div><div class="modal-note"><span>✦</span><span id="asrStatus">Mô hình Large-v3 được chạy trên server của bạn. Bài hát có nhạc nền/giọng hát chồng lấp có thể cần sửa lời thủ công.</span></div><div class="transcribe-progress" id="transcribeProgress" hidden><div class="progress-label"><span id="progressMessage">Đang chờ xử lý</span><b id="progressPercent">1%</b></div><div class="progress-track"><i id="progressFill"></i></div></div><button class="btn btn-primary modal-generate" id="modalGenerate"><span id="asrButtonText">Nhận diện trên server</span><span>→</span></button></div></div>
  </div>
  <script src="assets/app.js?v=20261112-theme"></script>
</body>
</html>
