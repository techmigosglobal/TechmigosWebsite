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

function db_table_exists(PDO $pdo, string $table): bool
{
    if (db_driver() === 'sqlite') {
        $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name");
        $stmt->execute(['name' => $table]);
        return is_array($stmt->fetch());
    }

    $stmt = $pdo->prepare('SHOW TABLES LIKE :name');
    $stmt->execute(['name' => $table]);
    return is_array($stmt->fetch());
}

function db_column_exists(PDO $pdo, string $table, string $column): bool
{
    if (db_driver() === 'sqlite') {
        $stmt = $pdo->query('PRAGMA table_info(' . $table . ')');
        $rows = $stmt ? $stmt->fetchAll() : [];
        foreach ((array) $rows as $row) {
            if (is_array($row) && (string) ($row['name'] ?? '') === $column) {
                return true;
            }
        }
        return false;
    }

    $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . $table . ' LIKE :column');
    $stmt->execute(['column' => $column]);
    return is_array($stmt->fetch());
}

function db_exec_if_missing_column(PDO $pdo, string $table, string $column, string $sql): void
{
    if (!db_column_exists($pdo, $table, $column)) {
        $pdo->exec($sql);
    }
}

function db_ensure_crm_schema(PDO $pdo): void
{
    if (db_driver() === 'sqlite') {
        db_exec_if_missing_column($pdo, 'contact_leads', 'status', "ALTER TABLE contact_leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
        db_exec_if_missing_column($pdo, 'contact_leads', 'priority', "ALTER TABLE contact_leads ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
        db_exec_if_missing_column($pdo, 'contact_leads', 'assigned_to', "ALTER TABLE contact_leads ADD COLUMN assigned_to INTEGER");
        db_exec_if_missing_column($pdo, 'contact_leads', 'next_followup_at', "ALTER TABLE contact_leads ADD COLUMN next_followup_at TEXT");
        db_exec_if_missing_column($pdo, 'contact_leads', 'updated_at', "ALTER TABLE contact_leads ADD COLUMN updated_at TEXT");

        db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'status', "ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
        db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'priority', "ALTER TABLE newsletter_subscribers ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
        db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'assigned_to', "ALTER TABLE newsletter_subscribers ADD COLUMN assigned_to INTEGER");
        db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'next_followup_at', "ALTER TABLE newsletter_subscribers ADD COLUMN next_followup_at TEXT");
        db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'updated_at', "ALTER TABLE newsletter_subscribers ADD COLUMN updated_at TEXT");

        db_exec_if_missing_column($pdo, 'career_applications', 'status', "ALTER TABLE career_applications ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
        db_exec_if_missing_column($pdo, 'career_applications', 'priority', "ALTER TABLE career_applications ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
        db_exec_if_missing_column($pdo, 'career_applications', 'assigned_to', "ALTER TABLE career_applications ADD COLUMN assigned_to INTEGER");
        db_exec_if_missing_column($pdo, 'career_applications', 'next_followup_at', "ALTER TABLE career_applications ADD COLUMN next_followup_at TEXT");
        db_exec_if_missing_column($pdo, 'career_applications', 'updated_at', "ALTER TABLE career_applications ADD COLUMN updated_at TEXT");

        $pdo->exec("UPDATE contact_leads SET updated_at = COALESCE(updated_at, created_at, datetime('now'))");
        $pdo->exec("UPDATE newsletter_subscribers SET updated_at = COALESCE(updated_at, created_at, datetime('now'))");
        $pdo->exec("UPDATE career_applications SET updated_at = COALESCE(updated_at, created_at, datetime('now'))");

        $pdo->exec('CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT "sales",
            password_hash TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            ip_address TEXT NOT NULL DEFAULT "unknown",
            user_agent TEXT NOT NULL DEFAULT ""
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS admin_activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT "{}",
            ip_address TEXT NOT NULL DEFAULT "unknown",
            user_agent TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            company TEXT NOT NULL,
            avatar TEXT NOT NULL DEFAULT "",
            result TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS portfolio_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT "",
            tags_json TEXT NOT NULL DEFAULT "[]",
            image TEXT NOT NULL DEFAULT "",
            description TEXT NOT NULL,
            result TEXT NOT NULL,
            overview TEXT NOT NULL,
            challenge TEXT NOT NULL,
            solution TEXT NOT NULL,
            timeline TEXT NOT NULL,
            team TEXT NOT NULL,
            services TEXT NOT NULL,
            featured INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS portfolio_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            metric TEXT NOT NULL,
            label TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE TABLE IF NOT EXISTS lead_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_type TEXT NOT NULL,
            lead_id INTEGER NOT NULL,
            author_user_id INTEGER,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL
        )');

        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_testimonials_sort_order ON testimonials(sort_order)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_portfolio_projects_sort_order ON portfolio_projects(sort_order)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_portfolio_results_project_id ON portfolio_results(project_id)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_lead_notes_ref ON lead_notes(lead_type, lead_id)');

        return;
    }

    db_exec_if_missing_column($pdo, 'contact_leads', 'status', "ALTER TABLE contact_leads ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'new'");
    db_exec_if_missing_column($pdo, 'contact_leads', 'priority', "ALTER TABLE contact_leads ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'");
    db_exec_if_missing_column($pdo, 'contact_leads', 'assigned_to', 'ALTER TABLE contact_leads ADD COLUMN assigned_to BIGINT UNSIGNED NULL');
    db_exec_if_missing_column($pdo, 'contact_leads', 'next_followup_at', 'ALTER TABLE contact_leads ADD COLUMN next_followup_at DATETIME NULL');
    db_exec_if_missing_column($pdo, 'contact_leads', 'updated_at', 'ALTER TABLE contact_leads ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'status', "ALTER TABLE newsletter_subscribers ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'new'");
    db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'priority', "ALTER TABLE newsletter_subscribers ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'");
    db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'assigned_to', 'ALTER TABLE newsletter_subscribers ADD COLUMN assigned_to BIGINT UNSIGNED NULL');
    db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'next_followup_at', 'ALTER TABLE newsletter_subscribers ADD COLUMN next_followup_at DATETIME NULL');
    db_exec_if_missing_column($pdo, 'newsletter_subscribers', 'updated_at', 'ALTER TABLE newsletter_subscribers ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    db_exec_if_missing_column($pdo, 'career_applications', 'status', "ALTER TABLE career_applications ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'new'");
    db_exec_if_missing_column($pdo, 'career_applications', 'priority', "ALTER TABLE career_applications ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'");
    db_exec_if_missing_column($pdo, 'career_applications', 'assigned_to', 'ALTER TABLE career_applications ADD COLUMN assigned_to BIGINT UNSIGNED NULL');
    db_exec_if_missing_column($pdo, 'career_applications', 'next_followup_at', 'ALTER TABLE career_applications ADD COLUMN next_followup_at DATETIME NULL');
    db_exec_if_missing_column($pdo, 'career_applications', 'updated_at', 'ALTER TABLE career_applications ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    $pdo->exec('CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT "sales",
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_admin_users_username (username),
      INDEX idx_admin_users_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS admin_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      last_seen_at DATETIME NOT NULL,
      ip_address VARCHAR(64) NOT NULL DEFAULT "unknown",
      user_agent VARCHAR(512) NOT NULL DEFAULT "",
      PRIMARY KEY (id),
      UNIQUE KEY uniq_admin_sessions_token_hash (token_hash),
      INDEX idx_admin_sessions_user_id (user_id),
      INDEX idx_admin_sessions_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      action VARCHAR(120) NOT NULL,
      metadata_json LONGTEXT NOT NULL,
      ip_address VARCHAR(64) NOT NULL DEFAULT "unknown",
      user_agent VARCHAR(512) NOT NULL DEFAULT "",
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_admin_activity_logs_user_id (user_id),
      INDEX idx_admin_activity_logs_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS testimonials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      quote TEXT NOT NULL,
      name VARCHAR(180) NOT NULL,
      role VARCHAR(180) NOT NULL,
      company VARCHAR(180) NOT NULL,
      avatar VARCHAR(512) NOT NULL DEFAULT "",
      result VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_testimonials_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS portfolio_projects (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug VARCHAR(190) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(120) NOT NULL,
      emoji VARCHAR(32) NOT NULL DEFAULT "",
      tags_json JSON NOT NULL,
      image VARCHAR(512) NOT NULL DEFAULT "",
      description TEXT NOT NULL,
      result VARCHAR(255) NOT NULL,
      overview TEXT NOT NULL,
      challenge TEXT NOT NULL,
      solution TEXT NOT NULL,
      timeline VARCHAR(120) NOT NULL,
      team VARCHAR(120) NOT NULL,
      services VARCHAR(255) NOT NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_portfolio_projects_slug (slug),
      INDEX idx_portfolio_projects_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS portfolio_results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      project_id BIGINT UNSIGNED NOT NULL,
      metric VARCHAR(120) NOT NULL,
      label VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_portfolio_results_project_id (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $pdo->exec('CREATE TABLE IF NOT EXISTS lead_notes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      lead_type VARCHAR(32) NOT NULL,
      lead_id BIGINT UNSIGNED NOT NULL,
      author_user_id BIGINT UNSIGNED NULL,
      note TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_lead_notes_ref (lead_type, lead_id),
      INDEX idx_lead_notes_author (author_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
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
        db_ensure_crm_schema($pdo);
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

    if (app_bool_env('DB_AUTO_MIGRATE_MYSQL', false)) {
        db_ensure_crm_schema($pdo);
    }

    return $pdo;
}
