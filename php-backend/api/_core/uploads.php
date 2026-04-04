<?php

declare(strict_types=1);

function file_extension(string $name): string
{
    $ext = pathinfo($name, PATHINFO_EXTENSION);
    return strtolower((string) $ext);
}

function sanitize_base_name(string $value): string
{
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9._-]+/', '-', $value) ?? 'candidate';
    $value = preg_replace('/-+/', '-', $value) ?? 'candidate';
    $value = trim($value, '-');
    if ($value === '') {
        return 'candidate';
    }

    return $value;
}

function validate_career_upload(array $file): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return 'Please upload your resume file.';
    }

    $cfg = app_config()['uploads'];
    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0) {
        return 'Please upload your resume file.';
    }

    if ($size > (int) $cfg['max_bytes']) {
        return 'Resume files must be 5 MB or smaller.';
    }

    $name = (string) ($file['name'] ?? '');
    $extension = file_extension($name);
    if (!in_array($extension, $cfg['allowed_extensions'], true)) {
        return 'Upload a PDF, DOC, or DOCX file.';
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return 'Please upload your resume file.';
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) $finfo->file($tmpPath);
    if ($mimeType !== '' && !in_array($mimeType, $cfg['allowed_mime_types'], true)) {
        return 'Upload a PDF, DOC, or DOCX file.';
    }

    return '';
}

function store_career_upload(array $file, string $applicantName): array
{
    $cfg = app_config()['uploads'];
    $targetDir = rtrim((string) $cfg['career_dir'], DIRECTORY_SEPARATOR);

    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
        json_error('Could not submit your application right now.', 500);
    }

    $originalName = (string) ($file['name'] ?? 'resume');
    $tmpPath = (string) ($file['tmp_name'] ?? '');
    $mimeType = (string) (new finfo(FILEINFO_MIME_TYPE))->file($tmpPath);
    $size = (int) ($file['size'] ?? 0);

    $extension = file_extension($originalName);
    if ($extension === '') {
        $extension = 'bin';
    }

    $safeBase = sanitize_base_name($applicantName !== '' ? $applicantName : 'candidate');
    $storedFileName = sprintf('%s-%s-%s.%s', $safeBase, (string) time(), bin2hex(random_bytes(4)), $extension);
    $absolutePath = $targetDir . DIRECTORY_SEPARATOR . $storedFileName;

    if (!move_uploaded_file($tmpPath, $absolutePath)) {
        json_error('Could not submit your application right now.', 500);
    }

    $relativePath = 'storage/uploads/careers/' . $storedFileName;

    return [
        'originalName' => $originalName,
        'storedFileName' => $storedFileName,
        'mimeType' => $mimeType !== '' ? $mimeType : 'application/octet-stream',
        'size' => $size,
        'absolutePath' => $absolutePath,
        'relativePath' => $relativePath,
    ];
}
