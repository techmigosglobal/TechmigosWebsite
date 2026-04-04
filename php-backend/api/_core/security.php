<?php

declare(strict_types=1);

function random_hex(int $bytes): string
{
    return bin2hex(random_bytes($bytes));
}

function csrf_generate_token(): array
{
    $secret = random_hex(32);
    $salt = random_hex(32);
    $signature = hash_hmac('sha256', $salt, $secret);

    return [
        'token' => $signature . '.' . $salt,
        'secret' => $secret,
    ];
}

function csrf_validate_token(string $token, string $secret): bool
{
    if ($token === '' || $secret === '') {
        return false;
    }

    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return false;
    }

    [$signature, $salt] = $parts;
    if ($signature === '' || $salt === '') {
        return false;
    }

    $expected = hash_hmac('sha256', $salt, $secret);
    return hash_equals($expected, $signature);
}

function csrf_set_secret_cookie(string $secret): void
{
    $cfg = app_config()['csrf'];

    setcookie($cfg['cookie_name'], $secret, [
        'expires' => time() + $cfg['cookie_max_age'],
        'path' => '/',
        'secure' => (bool) $cfg['secure_cookie'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function csrf_assert_request(): void
{
    $cfg = app_config()['csrf'];
    $headerToken = get_header_value($cfg['header_name']);
    $cookieSecret = $_COOKIE[$cfg['cookie_name']] ?? '';

    if (!is_string($cookieSecret)) {
        $cookieSecret = '';
    }

    if ($headerToken === '' || $cookieSecret === '' || !csrf_validate_token($headerToken, $cookieSecret)) {
        json_error('Invalid CSRF token. Please refresh the page and try again.', 403);
    }
}
