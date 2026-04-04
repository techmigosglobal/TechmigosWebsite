<?php

declare(strict_types=1);

require_once __DIR__ . '/_core/bootstrap.php';

ensure_method('GET');

$csrf = csrf_generate_token();
csrf_set_secret_cookie($csrf['secret']);
json_response(['token' => $csrf['token']], 200);
