<?php

declare(strict_types=1);

function mailer_config(): array
{
    return app_config()['mail'];
}

function mailer_is_enabled(): bool
{
    $cfg = mailer_config();
    return (bool) ($cfg['enabled'] ?? false);
}

function mailer_normalize_recipients(string $raw): array
{
    $parts = array_filter(array_map('trim', explode(',', $raw)));
    return array_values(array_filter($parts, static fn($item) => is_valid_email((string) $item)));
}

function mailer_encode_subject(string $subject): string
{
    $subject = trim($subject);
    if ($subject === '') {
        return 'Notification';
    }

    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function mailer_format_address(string $email, string $name = ''): string
{
    $email = trim($email);
    if ($name === '') {
        return $email;
    }

    $safeName = str_replace(['\"', "\r", "\n"], ['', '', ''], trim($name));
    return sprintf('"%s" <%s>', $safeName, $email);
}

function mailer_build_headers(array $message): string
{
    $cfg = mailer_config();
    $fromAddress = (string) ($cfg['from_address'] ?? '');
    $fromName = (string) ($cfg['from_name'] ?? 'Techmigos');

    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'From: ' . mailer_format_address($fromAddress, $fromName);
    $headers[] = 'Reply-To: ' . mailer_format_address((string) ($message['reply_to'] ?? $fromAddress));
    $headers[] = 'X-Mailer: Techmigos-PHP-Backend';

    return implode("\r\n", $headers);
}

function mailer_prepare_attachments(array $attachments): array
{
    $prepared = [];
    foreach ($attachments as $attachment) {
        if (!is_array($attachment)) {
            continue;
        }

        $path = trim((string) ($attachment['path'] ?? ''));
        if ($path === '' || !is_file($path) || !is_readable($path)) {
            continue;
        }

        $filename = trim((string) ($attachment['name'] ?? ''));
        if ($filename === '') {
            $filename = basename($path);
        }

        $mime = trim((string) ($attachment['mime'] ?? 'application/octet-stream'));
        if ($mime === '') {
            $mime = 'application/octet-stream';
        }

        $prepared[] = [
            'path' => $path,
            'name' => $filename,
            'mime' => $mime,
        ];
    }

    return $prepared;
}

function mailer_build_multipart_message(string $textBody, array $attachments): array
{
    $boundary = 'tm_' . bin2hex(random_bytes(12));
    $parts = [];
    $parts[] = "--{$boundary}";
    $parts[] = 'Content-Type: text/plain; charset=UTF-8';
    $parts[] = 'Content-Transfer-Encoding: 8bit';
    $parts[] = '';
    $parts[] = $textBody;

    foreach ($attachments as $attachment) {
        $raw = file_get_contents((string) $attachment['path']);
        if ($raw === false) {
            continue;
        }

        $encoded = chunk_split(base64_encode($raw));
        $name = str_replace(['"', "\r", "\n"], ['', '', ''], (string) $attachment['name']);
        $mime = (string) $attachment['mime'];

        $parts[] = "--{$boundary}";
        $parts[] = "Content-Type: {$mime}; name=\"{$name}\"";
        $parts[] = 'Content-Transfer-Encoding: base64';
        $parts[] = "Content-Disposition: attachment; filename=\"{$name}\"";
        $parts[] = '';
        $parts[] = $encoded;
    }

    $parts[] = "--{$boundary}--";
    $parts[] = '';

    return [
        'boundary' => $boundary,
        'body' => implode("\r\n", $parts),
    ];
}

function mailer_build_headers_for_message(array $message, bool $hasAttachments, ?string $boundary = null): string
{
    $cfg = mailer_config();
    $fromAddress = (string) ($cfg['from_address'] ?? '');
    $fromName = (string) ($cfg['from_name'] ?? 'Techmigos');
    $replyTo = trim((string) ($message['reply_to'] ?? $fromAddress));

    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    if ($hasAttachments && $boundary !== null) {
        $headers[] = "Content-Type: multipart/mixed; boundary=\"{$boundary}\"";
    } else {
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    }
    $headers[] = 'From: ' . mailer_format_address($fromAddress, $fromName);
    $headers[] = 'Reply-To: ' . mailer_format_address($replyTo);
    $headers[] = 'X-Mailer: Techmigos-PHP-Backend';

    return implode("\r\n", $headers);
}

function mailer_send_raw(array $message): bool
{
    $cfg = mailer_config();
    $subject = mailer_encode_subject((string) ($message['subject'] ?? 'Notification'));
    $textBody = trim((string) ($message['text'] ?? ''));
    if ($textBody === '') {
        return false;
    }

    $to = trim((string) ($message['to'] ?? ''));
    if (!is_valid_email($to)) {
        return false;
    }

    $attachments = mailer_prepare_attachments((array) ($message['attachments'] ?? []));
    $hasAttachments = count($attachments) > 0;
    $boundary = null;
    $body = $textBody;
    if ($hasAttachments) {
        $multipart = mailer_build_multipart_message($textBody, $attachments);
        $boundary = (string) ($multipart['boundary'] ?? '');
        $body = (string) ($multipart['body'] ?? '');
        if ($boundary === '' || $body === '') {
            return false;
        }
    }

    $headers = mailer_build_headers_for_message($message, $hasAttachments, $boundary);
    $additionalParams = trim((string) ($cfg['mail_additional_params'] ?? ''));

    if ($additionalParams !== '') {
        return mail($to, $subject, $body, $headers, $additionalParams);
    }

    return mail($to, $subject, $body, $headers);
}

function mailer_send(array $message): array
{
    if (!mailer_is_enabled()) {
        return ['ok' => false, 'reason' => 'disabled'];
    }

    $cfg = mailer_config();
    $fromAddress = trim((string) ($cfg['from_address'] ?? ''));
    if (!is_valid_email($fromAddress)) {
        return ['ok' => false, 'reason' => 'invalid_from_address'];
    }

    try {
        $ok = mailer_send_raw($message);
        if (!$ok) {
            return ['ok' => false, 'reason' => 'mail_send_failed'];
        }
        return ['ok' => true];
    } catch (Throwable $error) {
        error_log('[mail] send failed: ' . $error->getMessage());
        return ['ok' => false, 'reason' => 'exception'];
    }
}
