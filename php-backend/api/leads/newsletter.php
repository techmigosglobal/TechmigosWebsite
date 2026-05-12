<?php

declare(strict_types=1);

require_once __DIR__ . '/../_core/bootstrap.php';

ensure_method('POST');
csrf_assert_request();

try {
    $body = parse_json_body();
    $ip = get_client_ip();
    $userAgent = user_agent();

    $limit = app_config()['rate_limit']['newsletter_limit'];
    $rate = rate_limit_check('newsletter:' . $ip, $limit);
    if (!($rate['allowed'] ?? false)) {
        json_error('Too many requests. Please try again later.', 429);
    }

    $honeypot = as_string($body['company_website'] ?? '');
    if ($honeypot !== '') {
        json_ok(['accepted' => true]);
    }

    $email = as_string($body['email'] ?? '');
    if ($email === '' || !is_valid_email($email)) {
        json_error('Validation failed.', 400, ['email' => 'Valid email is required.']);
    }

    insert_newsletter_lead($email, $ip, $userAgent);
    $notification = notify_newsletter_submission($email, [
        'ip' => $ip,
        'userAgent' => $userAgent,
        'submittedAt' => gmdate('c'),
    ]);
    json_ok([
        'accepted' => true,
        'mail' => [
            'user' => $notification['user'] ?? ['ok' => false, 'reason' => 'unknown'],
            'company' => $notification['company'] ?? ['ok' => false, 'reason' => 'unknown'],
        ],
    ]);
} catch (Throwable $error) {
    error_log('[leads/newsletter] submission failed: ' . $error->getMessage());
    json_error('Could not subscribe right now.', 500);
}
