<?php

declare(strict_types=1);

require_once __DIR__ . '/../_core/bootstrap.php';

ensure_method('POST');
csrf_assert_request();

try {
    $body = parse_json_body();
    $ip = get_client_ip();
    $userAgent = user_agent();

    $limit = app_config()['rate_limit']['contact_limit'];
    $rate = rate_limit_check('contact:' . $ip, $limit);
    if (!($rate['allowed'] ?? false)) {
        json_error('Too many requests. Please try again later.', 429);
    }

    $honeypot = as_string($body['company_website'] ?? '');
    if ($honeypot !== '') {
        json_ok(['accepted' => true]);
    }

    $payload = [
        'name' => as_string($body['name'] ?? ''),
        'email' => as_string($body['email'] ?? ''),
        'company' => as_string($body['company'] ?? ''),
        'service' => as_string($body['service'] ?? ''),
        'budget' => as_string($body['budget'] ?? ''),
        'message' => as_string($body['message'] ?? ''),
        'sourcePath' => as_string($body['sourcePath'] ?? ''),
    ];

    $fieldErrors = [];
    if ($payload['name'] === '') {
        $fieldErrors['name'] = 'Name is required.';
    }
    if ($payload['email'] === '' || !is_valid_email($payload['email'])) {
        $fieldErrors['email'] = 'Valid email is required.';
    }
    if ($payload['message'] === '') {
        $fieldErrors['message'] = 'Project description is required.';
    }

    if (!empty($fieldErrors)) {
        json_error('Validation failed.', 400, $fieldErrors);
    }

    insert_contact_lead($payload, $ip, $userAgent);
    $notification = notify_contact_submission($payload, [
        'ip' => $ip,
        'userAgent' => $userAgent,
        'submittedAt' => gmdate('c'),
        'sourcePath' => $payload['sourcePath'],
    ]);
    json_ok([
        'accepted' => true,
        'mail' => [
            'user' => $notification['user'] ?? ['ok' => false, 'reason' => 'unknown'],
            'company' => $notification['company'] ?? ['ok' => false, 'reason' => 'unknown'],
        ],
    ]);
} catch (Throwable $error) {
    error_log('[leads/contact] submission failed: ' . $error->getMessage());
    json_error('Could not submit your message right now.', 500);
}
