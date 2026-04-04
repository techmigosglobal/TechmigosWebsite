<?php

declare(strict_types=1);

function app_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
}

function app_bool_env(string $key, bool $default = false): bool
{
    $value = app_env($key);
    if ($value === null) {
        return $default;
    }

    $normalized = strtolower(trim($value));
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function app_config(): array
{
    $isProduction = strtolower(app_env('APP_ENV', app_env('NODE_ENV', 'production')) ?? 'production') === 'production';

    return [
        'is_production' => $isProduction,
        'timezone' => app_env('APP_TIMEZONE', 'UTC') ?? 'UTC',
        'db' => [
            'driver' => strtolower(app_env('DB_DRIVER', 'mysql') ?? 'mysql'),
            'host' => app_env('DB_HOST', '127.0.0.1') ?? '127.0.0.1',
            'port' => (int) (app_env('DB_PORT', '3306') ?? '3306'),
            'name' => app_env('DB_NAME', 'techmigos') ?? 'techmigos',
            'user' => app_env('DB_USER', '') ?? '',
            'pass' => app_env('DB_PASS', '') ?? '',
            'charset' => app_env('DB_CHARSET', 'utf8mb4') ?? 'utf8mb4',
            'sqlite_path' => app_env('DB_SQLITE_PATH', __DIR__ . '/../../storage/local.sqlite') ?? (__DIR__ . '/../../storage/local.sqlite'),
        ],
        'csrf' => [
            'cookie_name' => app_env('CSRF_COOKIE_NAME', 'tm_csrf_secret') ?? 'tm_csrf_secret',
            'header_name' => app_env('CSRF_HEADER_NAME', 'x-csrf-token') ?? 'x-csrf-token',
            'cookie_max_age' => (int) (app_env('CSRF_COOKIE_MAX_AGE', '86400') ?? '86400'),
            'secure_cookie' => app_bool_env('CSRF_SECURE_COOKIE', $isProduction),
        ],
        'rate_limit' => [
            'window_seconds' => (int) (app_env('RATE_LIMIT_WINDOW_SECONDS', '900') ?? '900'),
            'contact_limit' => (int) (app_env('RATE_LIMIT_CONTACT', '6') ?? '6'),
            'careers_limit' => (int) (app_env('RATE_LIMIT_CAREERS', '5') ?? '5'),
            'newsletter_limit' => (int) (app_env('RATE_LIMIT_NEWSLETTER', '8') ?? '8'),
            'cleanup_probability' => (int) (app_env('RATE_LIMIT_CLEANUP_PROBABILITY', '100') ?? '100'),
        ],
        'uploads' => [
            'career_dir' => app_env('CAREER_UPLOAD_DIR', __DIR__ . '/../../storage/uploads/careers') ?? (__DIR__ . '/../../storage/uploads/careers'),
            'max_bytes' => (int) (app_env('CAREER_UPLOAD_MAX_BYTES', '5242880') ?? '5242880'),
            'allowed_extensions' => ['pdf', 'doc', 'docx'],
            'allowed_mime_types' => [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
        ],
    ];
}
