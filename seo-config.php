<?php
declare(strict_types=1);

function lyriccut_is_local_host(string $host): bool
{
    $host = strtolower(trim($host, '[]'));
    if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)
        || str_ends_with($host, '.test')
        || str_ends_with($host, '.localhost')
        || str_ends_with($host, '.local')) {
        return true;
    }
    return filter_var($host, FILTER_VALIDATE_IP) !== false
        && filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
}

function lyriccut_seo_context(string $pagePath = '/'): array
{
    $configured = trim((string)getenv('LYRICCUT_PUBLIC_URL'));
    $isConfigured = $configured !== '';
    if ($isConfigured) {
        $parts = parse_url($configured);
        if (!is_array($parts) || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http', 'https'], true)
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
            $configured = '';
            $isConfigured = false;
        } else {
            $scheme = strtolower((string)$parts['scheme']);
            $host = strtolower((string)$parts['host']);
            if (!lyriccut_is_local_host($host)) $scheme = 'https';
            $port = isset($parts['port']) && !in_array((int)$parts['port'], [80, 443], true) ? ':' . (int)$parts['port'] : '';
            $basePath = rtrim((string)($parts['path'] ?? ''), '/');
            $base = $scheme . '://' . $host . $port . $basePath;
            $local = lyriccut_is_local_host($host);
        }
    }

    if (!$isConfigured) {
        $rawHost = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        $hostParts = parse_url('http://' . $rawHost);
        $host = strtolower((string)($hostParts['host'] ?? 'localhost'));
        if (!preg_match('/^[a-z0-9.-]+$/i', $host)) $host = 'localhost';
        $local = lyriccut_is_local_host($host);
        $port = isset($hostParts['port']) && !in_array((int)$hostParts['port'], [80, 443], true) ? ':' . (int)$hostParts['port'] : '';
        $forwarded = strtolower(trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $forwarded === 'https';
        $scheme = $local ? ($https ? 'https' : 'http') : 'https';
        $scriptPath = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/'));
        $basePath = str_replace('\\', '/', dirname($scriptPath));
        $basePath = rtrim($basePath, '/.');
        $base = $scheme . '://' . $host . $port . $basePath;
    }

    $canonicalPath = '/' . ltrim($pagePath, '/');
    if ($pagePath === '/') $canonicalPath = '/';
    $canonical = rtrim($base, '/') . $canonicalPath;
    return [
        'base' => rtrim($base, '/'),
        'canonical' => $canonical,
        'is_local' => $local,
        'robots' => $local ? 'noindex,follow' : 'index,follow,max-image-preview:large',
    ];
}
