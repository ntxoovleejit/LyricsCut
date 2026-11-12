<?php
declare(strict_types=1);
require_once __DIR__ . '/seo-config.php';

header('Content-Type: text/plain; charset=utf-8');
$seo = lyriccut_seo_context('/');
if ($seo['is_local']) {
    echo "User-agent: *\nDisallow: /\n";
    exit;
}
echo "User-agent: *\nAllow: /\nSitemap: {$seo['base']}/sitemap.xml\n";
