<?php

declare(strict_types=1);

function db_driver(): string
{
    $driver = app_config()['db']['driver'] ?? 'mysql';
    return is_string($driver) && $driver !== '' ? strtolower($driver) : 'mysql';
}

function db_now_expression(): string
{
    return db_driver() === 'sqlite' ? "datetime('now')" : 'NOW()';
}

function db_bootstrap_sqlite_schema(PDO $pdo): void
{
    $schemaPath = __DIR__ . '/../../database/schema.sqlite.sql';
    if (!is_file($schemaPath)) {
        json_error('SQLite schema file is missing.', 500);
    }

    $sql = file_get_contents($schemaPath);
    if ($sql === false || trim($sql) === '') {
        json_error('SQLite schema file is invalid.', 500);
    }

    $pdo->exec($sql);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = app_config()['db'];

    $driver = db_driver();
    if ($driver === 'sqlite') {
        $sqlitePath = (string) ($cfg['sqlite_path'] ?? '');
        if ($sqlitePath === '') {
            json_error('SQLite path is not configured.', 500);
        }

        $sqliteDir = dirname($sqlitePath);
        if (!is_dir($sqliteDir) && !mkdir($sqliteDir, 0755, true) && !is_dir($sqliteDir)) {
            json_error('Could not initialize SQLite storage directory.', 500);
        }

        $dsn = 'sqlite:' . $sqlitePath;
        $pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        db_bootstrap_sqlite_schema($pdo);
        return $pdo;
    }

    if ($cfg['user'] === '') {
        json_error('Database is not configured.', 500);
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $cfg['host'],
        $cfg['port'],
        $cfg['name'],
        $cfg['charset']
    );

    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
