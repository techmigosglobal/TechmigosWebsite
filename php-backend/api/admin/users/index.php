<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $user = admin_require_roles(['admin']);
    $items = crm_list_users();
    admin_activity_log((int) $user['id'], 'admin.users.list', ['count' => count($items)]);
    json_ok(['items' => $items]);
}

if ($method === 'POST') {
    $user = admin_require_roles(['admin']);
    $body = parse_json_body();
    $item = crm_create_user($body);
    admin_activity_log((int) $user['id'], 'admin.users.create', ['id' => $item['id'] ?? null]);
    json_ok(['item' => $item]);
}

json_error('Method not allowed.', 405);
