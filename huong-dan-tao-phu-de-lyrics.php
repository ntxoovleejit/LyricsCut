<?php
require_once __DIR__ . '/seo-config.php';
$seo = lyriccut_seo_context('/huong-dan-tao-phu-de-lyrics.php');
$title = 'Cách tạo phụ đề lyrics cho video | Hướng dẫn LyricCut Studio';
$description = 'Hướng dẫn tải nhạc hoặc video, nhận dạng lời bài hát tiếng Việt bằng mô hình tự host, chỉnh mốc phụ đề và tuỳ biến kiểu chữ trong LyricCut Studio.';
$canonical = htmlspecialchars($seo['canonical'], ENT_QUOTES, 'UTF-8');
$base = htmlspecialchars($seo['base'], ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="<?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?>">
  <meta name="robots" content="<?= htmlspecialchars($seo['robots'], ENT_QUOTES, 'UTF-8') ?>">
  <link rel="canonical" href="<?= $canonical ?>">
  <link rel="icon" href="<?= $base ?>/assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate" hreflang="vi-VN" href="<?= $canonical ?>">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="LyricCut Studio">
  <meta property="og:title" content="<?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?>">
  <meta property="og:description" content="<?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?>">
  <meta property="og:url" content="<?= $canonical ?>">
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="stylesheet" href="assets/guide.css">
  <script type="application/ld+json">
  <?= json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'Article',
      'headline' => $title,
      'description' => $description,
      'inLanguage' => 'vi-VN',
      'mainEntityOfPage' => $seo['canonical'],
      'author' => ['@type' => 'Organization', 'name' => 'LyricCut Studio'],
      'publisher' => ['@type' => 'Organization', 'name' => 'LyricCut Studio'],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>
  </script>
</head>
<body>
  <header class="guide-nav"><a href="<?= $base ?>/" aria-label="LyricCut Studio">LyricCut Studio</a><a class="nav-cta" href="<?= $base ?>/">Mở trình chỉnh sửa <span aria-hidden="true">→</span></a></header>
  <main class="guide-page">
    <nav class="breadcrumbs" aria-label="Điều hướng"><a href="<?= $base ?>/">Trang chủ</a><span aria-hidden="true">/</span><span>Hướng dẫn</span></nav>
    <article>
      <header class="article-head"><p class="eyebrow">HƯỚNG DẪN SỬ DỤNG</p><h1>Cách tạo phụ đề lyrics cho video</h1><p class="intro">Tạo bản nháp lời bài hát có mốc thời gian, rà soát nội dung rồi tuỳ chỉnh phụ đề ngay trên timeline.</p></header>
      <div class="guide-content">
        <h2>1. Tải nhạc hoặc video lên</h2>
        <p>Mở LyricCut Studio và chọn tệp âm thanh hoặc video. Bạn cũng có thể thêm ảnh tĩnh để làm nền cho video có nhạc. Nội dung sẽ xuất hiện trong khu vực tư liệu và trên timeline khi được thêm vào dự án.</p>
        <h2>2. Chọn ngôn ngữ và nhận dạng lời hát</h2>
        <p>Chọn công cụ tạo phụ đề lyrics, đặt ngôn ngữ là Tiếng Việt nếu bài hát dùng tiếng Việt, rồi bắt đầu nhận dạng. Mô hình chạy trên máy chủ tự host của website; thời gian xử lý phụ thuộc độ dài tệp và cấu hình máy chủ.</p>
        <p>Nhạc có nhạc cụ lớn, bè chồng, luyến láy hoặc phát âm không rõ có thể làm kết quả sai. Hãy nghe lại và sửa bản nhận dạng trước khi dùng làm phụ đề hoàn chỉnh.</p>
        <h2>3. Sửa câu chữ và thời điểm hiển thị</h2>
        <p>Chọn một đoạn phụ đề trên timeline để di chuyển hoặc kéo hai mép nhằm chỉnh thời gian bắt đầu và kết thúc. Mở phần sửa lời để cập nhật câu chữ; phát lại đoạn tương ứng để kiểm tra chữ xuất hiện đúng lúc giọng hát vang lên.</p>
        <h2>4. Tuỳ chỉnh kiểu chữ</h2>
        <p>Dùng bảng kiểu phụ đề để đổi phông chữ, cỡ chữ, màu chữ, viền và vị trí. Nên chọn màu có độ tương phản tốt với hình nền để lời bài hát dễ đọc trên điện thoại lẫn màn hình lớn.</p>
        <h2>5. Xem trước và xuất</h2>
        <p>Phát thử toàn bộ dự án, kiểm tra đồng bộ tiếng và phụ đề, sau đó chọn độ phân giải xuất phù hợp: 720p, 1080p hoặc 4K. Tệp WebM xuất từ trình duyệt có thể cần chuyển đổi sang định dạng khác nếu nền tảng đăng tải yêu cầu MP4.</p>
        <aside class="guide-note"><strong>Mẹo để nhận dạng tốt hơn</strong><p>Dùng bản thu rõ giọng hát, hạn chế tiếng ồn và chọn đúng ngôn ngữ. Nếu lời bài hát có tên riêng hoặc từ khó, nhập gợi ý nhận dạng nếu tuỳ chọn này xuất hiện trong giao diện, rồi vẫn rà soát thủ công.</p></aside>
      </div>
      <footer class="article-footer"><p>Bắt đầu với một bản nháp lyrics và hoàn thiện phụ đề ngay trên timeline.</p><a class="nav-cta" href="<?= $base ?>/">Mở LyricCut Studio <span aria-hidden="true">→</span></a></footer>
    </article>
  </main>
  <footer class="site-footer">© LyricCut Studio · <a href="<?= $base ?>/">Trình chỉnh sửa video</a></footer>
</body>
</html>
