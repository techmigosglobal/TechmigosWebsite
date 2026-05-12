<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

ensure_method('POST');

try {
    $body = parse_json_body();
    $username = as_string($body['username'] ?? '');
    $password = is_string($body['password'] ?? null) ? (string) $body['password'] : '';

    $user = admin_login($username, $password);
    json_ok(['user' => $user]);
} catch (Throwable $error) {
    error_log('[admin/auth/login] failed: ' . $error->getMessage());
    json_error('Could not complete login.', 500);
}
