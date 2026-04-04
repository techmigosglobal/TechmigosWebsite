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
];

if (isset($routes[$uriPath])) {
    require $routes[$uriPath];
    return true;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode([
    'ok' => false,
    'error' => 'Not found.',
], JSON_UNESCAPED_SLASHES);
