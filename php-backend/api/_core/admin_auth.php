<?php

declare(strict_types=1);

const ADMIN_SESSION_COOKIE = 'tm_admin_token';
const ADMIN_SESSION_TTL_SECONDS = 43200;

function admin_role_hierarchy(): array
{
    return [
        'sales' => 10,
        'editor' => 20,
        'admin' => 30,
    ];
}

function normalize_admin_role(string $role): string
{
    $normalized = strtolower(trim($role));
    return array_key_exists($normalized, admin_role_hierarchy()) ? $normalized : 'sales';
}

function admin_cookie_secure(): bool
{
    return (bool) (app_config()['is_production'] ?? true);
}

function admin_hash_token(string $token): string
{
    return hash('sha256', $token);
}

function admin_generate_token(): string
{
    return bin2hex(random_bytes(40));
}

function admin_set_session_cookie(string $token): void
{
    setcookie(ADMIN_SESSION_COOKIE, $token, [
        'expires' => time() + ADMIN_SESSION_TTL_SECONDS,
        'path' => '/',
        'secure' => admin_cookie_secure(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function admin_clear_session_cookie(): void
{
    setcookie(ADMIN_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => admin_cookie_secure(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function admin_activity_log(?int $userId, string $action, array $metadata = []): void
{
    $stmt = db()->prepare(
        'INSERT INTO admin_activity_logs (user_id, action, metadata_json, ip_address, user_agent, created_at)
         VALUES (:user_id, :action, :metadata_json, :ip_address, :user_agent, ' . db_now_expression() . ')'
    );

    $stmt->execute([
        'user_id' => $userId,
        'action' => $action,
        'metadata_json' => json_encode($metadata, JSON_UNESCAPED_SLASHES),
        'ip_address' => get_client_ip(),
        'user_agent' => user_agent(),
    ]);
}

function admin_bootstrap_credentials(): array
{
    return [
        'username' => as_string(app_env('ADMIN_USERNAME', 'admin')),
        'password' => (string) (app_env('ADMIN_PASSWORD', 'admin123') ?? 'admin123'),
        'email' => as_string(app_env('ADMIN_EMAIL', 'admin@techmigos.local')),
        'name' => as_string(app_env('ADMIN_NAME', 'Company Admin')),
    ];
}

function admin_bootstrap_credentials_are_weak(array $bootstrap): bool
{
    $username = strtolower(trim((string) ($bootstrap['username'] ?? '')));
    $password = strtolower(trim((string) ($bootstrap['password'] ?? '')));

    if ($username === '' || $password === '') {
        return true;
    }

    return $username === 'admin' || $password === 'admin123' || str_contains($password, 'replace-with');
}

function admin_ensure_bootstrap_user(): void
{
    $count = (int) db()->query('SELECT COUNT(*) FROM admin_users')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $bootstrap = admin_bootstrap_credentials();
    $isProduction = (bool) (app_config()['is_production'] ?? true);
    if ($isProduction && admin_bootstrap_credentials_are_weak($bootstrap)) {
        json_error('Unsafe ADMIN_USERNAME/ADMIN_PASSWORD in production. Configure strong bootstrap credentials.', 500);
    }

    if ($bootstrap['username'] === '' || $bootstrap['password'] === '') {
        return;
    }

    $passwordHash = password_hash($bootstrap['password'], PASSWORD_DEFAULT);
    $stmt = db()->prepare(
        'INSERT INTO admin_users (username, email, full_name, role, password_hash, is_active, created_at, updated_at)
         VALUES (:username, :email, :full_name, :role, :password_hash, :is_active, ' . db_now_expression() . ', ' . db_now_expression() . ')'
    );

    $stmt->execute([
        'username' => $bootstrap['username'],
        'email' => $bootstrap['email'] !== '' ? $bootstrap['email'] : $bootstrap['username'] . '@techmigos.local',
        'full_name' => $bootstrap['name'] !== '' ? $bootstrap['name'] : 'Company Admin',
        'role' => 'admin',
        'password_hash' => $passwordHash,
        'is_active' => 1,
    ]);

    admin_activity_log((int) db()->lastInsertId(), 'admin.bootstrap_user_created', [
        'username' => $bootstrap['username'],
    ]);
}

function admin_fetch_user_by_username(string $username): ?array
{
    $stmt = db()->prepare('SELECT * FROM admin_users WHERE username = :username LIMIT 1');
    $stmt->execute(['username' => $username]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function admin_find_user_by_id(int $userId): ?array
{
    $stmt = db()->prepare('SELECT id, username, email, full_name, role, is_active, created_at, updated_at FROM admin_users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function admin_public_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'username' => (string) $user['username'],
        'email' => (string) ($user['email'] ?? ''),
        'fullName' => (string) ($user['full_name'] ?? ''),
        'role' => normalize_admin_role((string) ($user['role'] ?? 'sales')),
        'isActive' => (int) ($user['is_active'] ?? 0) === 1,
        'createdAt' => (string) ($user['created_at'] ?? ''),
        'updatedAt' => (string) ($user['updated_at'] ?? ''),
    ];
}

function admin_create_session(int $userId): string
{
    $token = admin_generate_token();
    $tokenHash = admin_hash_token($token);

    $stmt = db()->prepare(
        'INSERT INTO admin_sessions (user_id, token_hash, expires_at, created_at, last_seen_at, ip_address, user_agent)
         VALUES (:user_id, :token_hash, :expires_at, ' . db_now_expression() . ', ' . db_now_expression() . ', :ip_address, :user_agent)'
    );

    $expiresAt = gmdate('Y-m-d H:i:s', time() + ADMIN_SESSION_TTL_SECONDS);

    $stmt->execute([
        'user_id' => $userId,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
        'ip_address' => get_client_ip(),
        'user_agent' => user_agent(),
    ]);

    admin_set_session_cookie($token);
    return $token;
}

function admin_revoke_session_by_token(string $token): void
{
    if ($token === '') {
        return;
    }

    $stmt = db()->prepare('DELETE FROM admin_sessions WHERE token_hash = :token_hash');
    $stmt->execute(['token_hash' => admin_hash_token($token)]);
}

function admin_cleanup_expired_sessions(): void
{
    $stmt = db()->prepare('DELETE FROM admin_sessions WHERE expires_at <= :now');
    $stmt->execute(['now' => gmdate('Y-m-d H:i:s')]);
}

function admin_current_user(): ?array
{
    admin_cleanup_expired_sessions();

    $token = $_COOKIE[ADMIN_SESSION_COOKIE] ?? '';
    if (!is_string($token) || trim($token) === '') {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT s.id AS session_id, s.user_id, s.expires_at, u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at, u.updated_at
         FROM admin_sessions s
         INNER JOIN admin_users u ON u.id = s.user_id
         WHERE s.token_hash = :token_hash
         LIMIT 1'
    );
    $stmt->execute(['token_hash' => admin_hash_token($token)]);
    $row = $stmt->fetch();

    if (!is_array($row)) {
        return null;
    }

    if ((int) ($row['is_active'] ?? 0) !== 1) {
        admin_revoke_session_by_token($token);
        return null;
    }

    $expiresAt = strtotime((string) ($row['expires_at'] ?? ''));
    if ($expiresAt === false || $expiresAt < time()) {
        admin_revoke_session_by_token($token);
        return null;
    }

    $touch = db()->prepare('UPDATE admin_sessions SET last_seen_at = ' . db_now_expression() . ' WHERE id = :id');
    $touch->execute(['id' => (int) $row['session_id']]);

    return admin_public_user($row);
}

function admin_require_auth(): array
{
    $user = admin_current_user();
    if ($user === null) {
        json_error('Unauthorized', 401);
    }

    return $user;
}

function admin_user_has_any_role(array $user, array $roles): bool
{
    $current = normalize_admin_role((string) ($user['role'] ?? 'sales'));
    $allowed = [];
    foreach ($roles as $role) {
        $allowed[] = normalize_admin_role((string) $role);
    }

    return in_array($current, $allowed, true);
}

function admin_require_roles(array $roles): array
{
    $user = admin_require_auth();
    if (!admin_user_has_any_role($user, $roles)) {
        json_error('Forbidden', 403);
    }

    return $user;
}

function admin_login(string $username, string $password): array
{
    admin_ensure_bootstrap_user();

    if ($username === '' || $password === '') {
        json_error('Invalid username or password.', 401);
    }

    $user = admin_fetch_user_by_username($username);
    if ($user === null || (int) ($user['is_active'] ?? 0) !== 1) {
        json_error('Invalid username or password.', 401);
    }

    $hash = (string) ($user['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
        json_error('Invalid username or password.', 401);
    }

    admin_create_session((int) $user['id']);
    admin_activity_log((int) $user['id'], 'admin.auth.login', []);

    return admin_public_user($user);
}
