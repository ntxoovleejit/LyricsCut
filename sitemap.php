<?php
declare(strict_types=1);
require_once __DIR__ . '/seo-config.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
$seo = lyriccut_seo_context('/');
echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
if (!$seo['is_local']) {
    foreach (['/', '/huong-dan-tao-phu-de-lyrics.php'] as $path) {
        $url = htmlspecialchars($seo['base'] . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        echo '<url><loc>' . $url . '</loc></url>';
    }
}
echo '</urlset>';
