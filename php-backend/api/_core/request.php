<?php

declare(strict_types=1);

function ensure_method(string $expected): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method !== strtoupper($expected)) {
        json_error('Method not allowed.', 405);
    }
}

function get_header_value(string $name): string
{
    $normalized = strtoupper(str_replace('-', '_', $name));
    $direct = $_SERVER['HTTP_' . $normalized] ?? null;
    if (is_string($direct)) {
        return trim($direct);
    }

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $value) {
            if (strcasecmp($key, $name) === 0) {
                return is_string($value) ? trim($value) : '';
            }
        }
    }

    return '';
}

function parse_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_error('Invalid JSON payload.', 400);
    }

    return $decoded;
}

function get_client_ip(): string
{
    $forwarded = get_header_value('x-forwarded-for');
    if ($forwarded !== '') {
        $parts = explode(',', $forwarded);
        $candidate = trim($parts[0] ?? '');
        if ($candidate !== '') {
            return $candidate;
        }
    }

    $realIp = get_header_value('x-real-ip');
    if ($realIp !== '') {
        return $realIp;
    }

    $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return is_string($remote) && $remote !== '' ? $remote : 'unknown';
}

function user_agent(): string
{
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    return is_string($ua) ? trim($ua) : '';
}
