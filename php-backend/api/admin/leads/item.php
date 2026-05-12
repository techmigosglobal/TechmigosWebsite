<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

$type = query_param('type', '');
$id = query_int_param('id', 0);

if ($id <= 0) {
    json_error('Invalid lead id.', 400);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $user = admin_require_roles(['admin', 'sales']);
    $lead = crm_get_lead($type, $id);
    if ($lead === null) {
        json_error('Lead not found.', 404);
    }

    admin_activity_log((int) $user['id'], 'admin.leads.detail', [
        'type' => $type,
        'id' => $id,
    ]);

    json_ok(['item' => $lead]);
}

if ($method === 'PATCH') {
    $user = admin_require_roles(['admin', 'sales']);
    $body = parse_json_body();
    $lead = crm_update_lead($type, $id, $body);

    admin_activity_log((int) $user['id'], 'admin.leads.update', [
        'type' => $type,
        'id' => $id,
        'fields' => array_keys($body),
    ]);

    json_ok(['item' => $lead]);
}

json_error('Method not allowed.', 405);
