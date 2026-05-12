<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

$id = query_int_param('id', 0);
if ($id <= 0) {
    json_error('Invalid portfolio id.', 400);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'PUT') {
    $user = admin_require_roles(['admin', 'editor']);
    $body = parse_json_body();
    $item = crm_update_portfolio_project($id, $body);
    admin_activity_log((int) $user['id'], 'admin.portfolio.update', ['id' => $id]);
    json_ok(['item' => $item]);
}

if ($method === 'DELETE') {
    $user = admin_require_roles(['admin', 'editor']);
    crm_delete_portfolio_project($id);
    admin_activity_log((int) $user['id'], 'admin.portfolio.delete', ['id' => $id]);
    json_ok();
}

json_error('Method not allowed.', 405);
