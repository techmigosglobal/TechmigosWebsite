<?php

declare(strict_types=1);

function json_response(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function json_ok(?array $data = null): void
{
    if ($data === null) {
        json_response(['ok' => true], 200);
    }

    json_response(['ok' => true, 'data' => $data], 200);
}

function json_error(string $error, int $status = 400, array $fieldErrors = []): void
{
    $body = ['ok' => false, 'error' => $error];
    if (!empty($fieldErrors)) {
        $body['fieldErrors'] = $fieldErrors;
    }

    json_response($body, $status);
}
