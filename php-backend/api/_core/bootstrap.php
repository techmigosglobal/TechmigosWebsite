<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/request.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/repositories.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/crm_repository.php';

$appConfig = app_config();
date_default_timezone_set($appConfig['timezone']);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
