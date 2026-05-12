<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

$id = query_int_param('id', 0);
if ($id <= 0) {
    json_error('Invalid user id.', 400);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'PATCH') {
    $user = admin_require_roles(['admin']);
    $body = parse_json_body();

    if (!array_key_exists('isActive', $body)) {
        json_error('Validation failed.', 400, ['isActive' => 'isActive is required.']);
    }

    $item = crm_update_user_status($id, to_bool($body['isActive']));

    admin_activity_log((int) $user['id'], 'admin.users.update_status', [
        'id' => $id,
        'isActive' => $item['isActive'] ?? null,
    ]);

    json_ok(['item' => $item]);
}

json_error('Method not allowed.', 405);
