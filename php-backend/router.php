<?php

declare(strict_types=1);

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uriPath = is_string($uriPath) ? $uriPath : '/';

$publicFile = __DIR__ . $uriPath;
if ($uriPath !== '/' && is_file($publicFile)) {
    return false;
}

$routes = [
    '/api/csrf' => __DIR__ . '/api/csrf.php',
    '/api/leads/contact' => __DIR__ . '/api/leads/contact.php',
    '/api/leads/newsletter' => __DIR__ . '/api/leads/newsletter.php',
    '/api/leads/careers' => __DIR__ . '/api/leads/careers.php',

    '/api/admin/auth/login' => __DIR__ . '/api/admin/auth/login.php',
    '/api/admin/auth/logout' => __DIR__ . '/api/admin/auth/logout.php',
    '/api/admin/auth/me' => __DIR__ . '/api/admin/auth/me.php',

    '/api/admin/testimonials' => __DIR__ . '/api/admin/testimonials/index.php',
    '/api/admin/portfolio' => __DIR__ . '/api/admin/portfolio/index.php',
    '/api/admin/leads' => __DIR__ . '/api/admin/leads/index.php',
    '/api/admin/users' => __DIR__ . '/api/admin/users/index.php',
];

if (isset($routes[$uriPath])) {
    require $routes[$uriPath];
    return true;
}

if (preg_match('#^/api/admin/testimonials/(\d+)$#', $uriPath, $matches) === 1) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/api/admin/testimonials/item.php';
    return true;
}

if (preg_match('#^/api/admin/portfolio/(\d+)$#', $uriPath, $matches) === 1) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/api/admin/portfolio/item.php';
    return true;
}

if (preg_match('#^/api/admin/leads/([a-z]+)/([0-9]+)$#', $uriPath, $matches) === 1) {
    $_GET['type'] = $matches[1];
    $_GET['id'] = $matches[2];
    require __DIR__ . '/api/admin/leads/item.php';
    return true;
}

if (preg_match('#^/api/admin/leads/([a-z]+)/([0-9]+)/notes$#', $uriPath, $matches) === 1) {
    $_GET['type'] = $matches[1];
    $_GET['id'] = $matches[2];
    require __DIR__ . '/api/admin/leads/notes.php';
    return true;
}

if (preg_match('#^/api/admin/users/(\d+)$#', $uriPath, $matches) === 1) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/api/admin/users/item.php';
    return true;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode([
    'ok' => false,
    'error' => 'Not found.',
], JSON_UNESCAPED_SLASHES);
