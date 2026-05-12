<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

ensure_method('GET');

$user = admin_require_roles(['admin', 'sales']);

$filters = [
    'type' => query_param('type', ''),
    'status' => query_param('status', ''),
    'priority' => query_param('priority', ''),
    'assignedTo' => query_param('assignedTo', ''),
    'search' => query_param('search', ''),
    'limit' => query_int_param('limit', 50),
    'offset' => query_int_param('offset', 0),
];

$items = crm_list_leads($filters);
$counters = crm_lead_dashboard_counters();

admin_activity_log((int) $user['id'], 'admin.leads.list', [
    'filters' => $filters,
    'count' => count($items),
]);

json_ok([
    'items' => $items,
    'counters' => $counters,
]);
