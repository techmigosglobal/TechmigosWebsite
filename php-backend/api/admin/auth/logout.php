<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

ensure_method('POST');

try {
    $user = admin_require_auth();
    $token = $_COOKIE[ADMIN_SESSION_COOKIE] ?? '';
    if (is_string($token) && $token !== '') {
        admin_revoke_session_by_token($token);
    }

    admin_clear_session_cookie();
    admin_activity_log((int) $user['id'], 'admin.auth.logout', []);
    json_ok();
} catch (Throwable $error) {
    error_log('[admin/auth/logout] failed: ' . $error->getMessage());
    json_error('Could not log out.', 500);
}
