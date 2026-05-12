<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_core/bootstrap.php';

ensure_method('GET');

$user = admin_current_user();
if ($user === null) {
    json_error('Unauthorized', 401);
}

json_ok(['user' => $user]);
