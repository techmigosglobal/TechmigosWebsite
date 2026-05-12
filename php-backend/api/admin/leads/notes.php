<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

ensure_method('POST');

$user = admin_require_roles(['admin', 'sales']);

$type = query_param('type', '');
$id = query_int_param('id', 0);
if ($id <= 0) {
    json_error('Invalid lead id.', 400);
}

$body = parse_json_body();
$note = as_string($body['note'] ?? '');

$item = crm_add_lead_note($type, $id, (int) $user['id'], $note);

admin_activity_log((int) $user['id'], 'admin.leads.note.create', [
    'type' => $type,
    'id' => $id,
]);

json_ok(['item' => $item]);
