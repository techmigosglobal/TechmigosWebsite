<?php

declare(strict_types=1);

require_once __DIR__ . '/../_core/bootstrap.php';

ensure_method('POST');
csrf_assert_request();

try {
    $ip = get_client_ip();
    $userAgent = user_agent();

    $limit = app_config()['rate_limit']['careers_limit'];
    $rate = rate_limit_check('careers:' . $ip, $limit);
    if (!($rate['allowed'] ?? false)) {
        json_error('Too many requests. Please try again later.', 429);
    }

    $honeypot = as_string($_POST['company_website'] ?? '');
    if ($honeypot !== '') {
        json_ok(['accepted' => true]);
    }

    $payload = [
        'jobTitle' => as_string($_POST['jobTitle'] ?? ''),
        'name' => as_string($_POST['name'] ?? ''),
        'email' => as_string($_POST['email'] ?? ''),
        'linkedin' => as_string($_POST['linkedin'] ?? ''),
        'portfolio' => as_string($_POST['portfolio'] ?? ''),
        'coverLetter' => as_string($_POST['coverLetter'] ?? ''),
    ];

    $uploadFile = $_FILES['cv'] ?? null;
    $fieldErrors = [];

    if ($payload['jobTitle'] === '') {
        $fieldErrors['jobTitle'] = 'Job title is required.';
    }
    if ($payload['name'] === '') {
        $fieldErrors['name'] = 'Name is required.';
    }
    if ($payload['email'] === '' || !is_valid_email($payload['email'])) {
        $fieldErrors['email'] = 'Valid email is required.';
    }
    if ($payload['coverLetter'] === '' || mb_strlen($payload['coverLetter']) < 30) {
        $fieldErrors['coverLetter'] = 'Please add at least 30 characters in your cover letter.';
    }

    if (!is_array($uploadFile)) {
        $fieldErrors['cv'] = 'Please upload your resume file.';
    } else {
        $uploadError = validate_career_upload($uploadFile);
        if ($uploadError !== '') {
            $fieldErrors['cv'] = $uploadError;
        }
    }

    if (!empty($fieldErrors)) {
        json_error('Validation failed.', 400, $fieldErrors);
    }

    $storedUpload = store_career_upload($uploadFile, $payload['name']);
    insert_career_application($payload, $storedUpload, $ip, $userAgent);

    json_ok(['accepted' => true]);
} catch (Throwable $error) {
    error_log('[leads/careers] submission failed: ' . $error->getMessage());
    json_error('Could not submit your application right now.', 500);
}
