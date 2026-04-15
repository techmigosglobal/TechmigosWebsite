<?php

declare(strict_types=1);

function form_url_for(string $type): string
{
    $site = rtrim((string) (app_config()['site_url'] ?? 'https://techmigos.com'), '/');

    return match ($type) {
        'contact' => $site . '/contact',
        'newsletter' => $site . '/#newsletter-form',
        'careers' => $site . '/careers',
        default => $site,
    };
}

function compact_line(string $label, string $value): string
{
    return sprintf("%s: %s", $label, trim($value) !== '' ? trim($value) : '-');
}

function mail_send_company_notification(string $subject, array $lines, array $attachments = []): array
{
    $cfg = app_config()['mail'];
    if (!(bool) ($cfg['send_company_notifications'] ?? true)) {
        return ['ok' => false, 'reason' => 'company_notifications_disabled', 'errors' => []];
    }

    $toList = mailer_normalize_recipients((string) ($cfg['company_to'] ?? ''));
    if (empty($toList)) {
        return ['ok' => false, 'reason' => 'company_recipients_missing', 'errors' => []];
    }

    $text = implode("\n", $lines);
    $errors = [];
    foreach ($toList as $to) {
        $result = mailer_send([
            'to' => $to,
            'subject' => $subject,
            'text' => $text,
            'attachments' => $attachments,
        ]);

        if (!($result['ok'] ?? false)) {
            error_log('[mail] company notification failed: ' . json_encode($result));
            $errors[] = [
                'to' => $to,
                'result' => $result,
            ];
        }
    }

    return [
        'ok' => count($errors) === 0,
        'reason' => count($errors) === 0 ? 'sent' : 'send_failed',
        'errors' => $errors,
    ];
}

function mail_send_user_confirmation(string $to, string $subject, array $lines): array
{
    $cfg = app_config()['mail'];
    if (!(bool) ($cfg['send_user_confirmations'] ?? true)) {
        return ['ok' => false, 'reason' => 'user_confirmations_disabled'];
    }

    if (!is_valid_email($to)) {
        return ['ok' => false, 'reason' => 'invalid_recipient'];
    }

    $text = implode("\n", $lines);
    $result = mailer_send([
        'to' => $to,
        'subject' => $subject,
        'text' => $text,
    ]);

    if (!($result['ok'] ?? false)) {
        error_log('[mail] user confirmation failed: ' . json_encode($result));
        return ['ok' => false, 'reason' => (string) ($result['reason'] ?? 'mail_send_failed')];
    }

    return ['ok' => true, 'reason' => 'sent'];
}

function notify_contact_submission(array $payload, array $meta): array
{
    if (!mailer_is_enabled()) {
        return ['ok' => false, 'reason' => 'mailer_disabled'];
    }

    $submittedAt = (string) ($meta['submittedAt'] ?? gmdate('c'));
    $ip = (string) ($meta['ip'] ?? 'unknown');
    $userAgent = (string) ($meta['userAgent'] ?? '');
    $site = rtrim((string) (app_config()['site_url'] ?? 'https://techmigos.com'), '/');
    $sourcePath = trim((string) ($meta['sourcePath'] ?? ''));
    if ($sourcePath === '') {
        $source = form_url_for('contact');
    } elseif (str_starts_with($sourcePath, '/')) {
        $source = $site . $sourcePath;
    } else {
        $source = $sourcePath;
    }

    $userResult = mail_send_user_confirmation(
        (string) $payload['email'],
        'We received your message - Techmigos',
        [
            'Hi ' . ((string) $payload['name'] !== '' ? (string) $payload['name'] : 'there') . ',',
            '',
            'Thanks for contacting Techmigos. Our team received your inquiry and will reply shortly.',
            '',
            'Reference details:',
            compact_line('Service', (string) ($payload['service'] ?? '')),
            compact_line('Budget', (string) ($payload['budget'] ?? '')),
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('Form URL', $source),
            '',
            'Best regards,',
            'Techmigos Team',
        ]
    );

    $companyResult = mail_send_company_notification(
        '[Contact] New inquiry from ' . (string) ($payload['name'] ?? 'Unknown'),
        [
            'A new contact form submission was received.',
            '',
            compact_line('Name', (string) ($payload['name'] ?? '')),
            compact_line('Email', (string) ($payload['email'] ?? '')),
            compact_line('Company', (string) ($payload['company'] ?? '')),
            compact_line('Service', (string) ($payload['service'] ?? '')),
            compact_line('Budget', (string) ($payload['budget'] ?? '')),
            compact_line('Message', (string) ($payload['message'] ?? '')),
            '',
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('IP', $ip),
            compact_line('User Agent', $userAgent),
            compact_line('Form URL', $source),
        ]
    );

    return [
        'ok' => ($userResult['ok'] ?? false) || ($companyResult['ok'] ?? false),
        'user' => $userResult,
        'company' => $companyResult,
    ];
}

function notify_newsletter_submission(string $email, array $meta): array
{
    if (!mailer_is_enabled()) {
        return ['ok' => false, 'reason' => 'mailer_disabled'];
    }

    $submittedAt = (string) ($meta['submittedAt'] ?? gmdate('c'));
    $ip = (string) ($meta['ip'] ?? 'unknown');
    $userAgent = (string) ($meta['userAgent'] ?? '');
    $source = form_url_for('newsletter');

    $userResult = mail_send_user_confirmation(
        $email,
        'You are subscribed - Techmigos newsletter',
        [
            'Hi,',
            '',
            'Thanks for subscribing to Techmigos updates.',
            '',
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('Form URL', $source),
            '',
            'Techmigos Team',
        ]
    );

    $companyResult = mail_send_company_notification(
        '[Newsletter] New subscriber',
        [
            'A new newsletter subscription was received.',
            '',
            compact_line('Email', $email),
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('IP', $ip),
            compact_line('User Agent', $userAgent),
            compact_line('Form URL', $source),
        ]
    );

    return [
        'ok' => ($userResult['ok'] ?? false) || ($companyResult['ok'] ?? false),
        'user' => $userResult,
        'company' => $companyResult,
    ];
}

function notify_career_submission(array $payload, array $upload, array $meta): array
{
    if (!mailer_is_enabled()) {
        return ['ok' => false, 'reason' => 'mailer_disabled'];
    }

    $submittedAt = (string) ($meta['submittedAt'] ?? gmdate('c'));
    $ip = (string) ($meta['ip'] ?? 'unknown');
    $userAgent = (string) ($meta['userAgent'] ?? '');
    $source = form_url_for('careers');

    $userResult = mail_send_user_confirmation(
        (string) $payload['email'],
        'Application received - Techmigos careers',
        [
            'Hi ' . ((string) $payload['name'] !== '' ? (string) $payload['name'] : 'there') . ',',
            '',
            'Thanks for applying to Techmigos. We received your application and will review it shortly.',
            '',
            compact_line('Job Title', (string) ($payload['jobTitle'] ?? '')),
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('Form URL', $source),
            '',
            'Techmigos Hiring Team',
        ]
    );

    $companyResult = mail_send_company_notification(
        '[Careers] New application for ' . (string) ($payload['jobTitle'] ?? 'Unknown role'),
        [
            'A new careers form submission was received.',
            '',
            compact_line('Job Title', (string) ($payload['jobTitle'] ?? '')),
            compact_line('Name', (string) ($payload['name'] ?? '')),
            compact_line('Email', (string) ($payload['email'] ?? '')),
            compact_line('LinkedIn', (string) ($payload['linkedin'] ?? '')),
            compact_line('Portfolio', (string) ($payload['portfolio'] ?? '')),
            compact_line('Cover Letter', (string) ($payload['coverLetter'] ?? '')),
            compact_line('Resume File', (string) ($upload['storedFileName'] ?? '')),
            compact_line('Resume Path', (string) ($upload['relativePath'] ?? '')),
            compact_line('Resume Original Name', (string) ($upload['originalName'] ?? '')),
            '',
            compact_line('Submitted At (UTC)', $submittedAt),
            compact_line('IP', $ip),
            compact_line('User Agent', $userAgent),
            compact_line('Form URL', $source),
        ],
        [
            [
                'path' => (string) ($upload['absolutePath'] ?? ''),
                'name' => (string) (($upload['originalName'] ?? '') !== '' ? $upload['originalName'] : ($upload['storedFileName'] ?? 'resume')),
                'mime' => (string) ($upload['mimeType'] ?? 'application/octet-stream'),
            ],
        ]
    );

    return [
        'ok' => ($userResult['ok'] ?? false) || ($companyResult['ok'] ?? false),
        'user' => $userResult,
        'company' => $companyResult,
    ];
}
