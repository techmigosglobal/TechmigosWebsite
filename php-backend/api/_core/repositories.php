<?php

declare(strict_types=1);

function insert_contact_lead(array $payload, string $ipAddress, string $userAgent): void
{
    $nowExpression = db_now_expression();
    $stmt = db()->prepare(
        'INSERT INTO contact_leads (
            name, email, company, service, budget, message, ip_address, user_agent, created_at
        ) VALUES (
            :name, :email, :company, :service, :budget, :message, :ip_address, :user_agent, ' . $nowExpression . '
        )'
    );

    $stmt->execute([
        'name' => $payload['name'],
        'email' => $payload['email'],
        'company' => $payload['company'],
        'service' => $payload['service'],
        'budget' => $payload['budget'],
        'message' => $payload['message'],
        'ip_address' => $ipAddress,
        'user_agent' => $userAgent,
    ]);
}

function insert_newsletter_lead(string $email, string $ipAddress, string $userAgent): void
{
    $nowExpression = db_now_expression();
    $stmt = db()->prepare(
        'INSERT INTO newsletter_subscribers (
            email, ip_address, user_agent, created_at
        ) VALUES (
            :email, :ip_address, :user_agent, ' . $nowExpression . '
        )'
    );

    $stmt->execute([
        'email' => $email,
        'ip_address' => $ipAddress,
        'user_agent' => $userAgent,
    ]);
}

function insert_career_application(array $payload, array $upload, string $ipAddress, string $userAgent): void
{
    $nowExpression = db_now_expression();
    $stmt = db()->prepare(
        'INSERT INTO career_applications (
            job_title,
            name,
            email,
            linkedin,
            portfolio,
            cover_letter,
            resume_original_name,
            resume_stored_file_name,
            resume_mime_type,
            resume_size,
            resume_path,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            :job_title,
            :name,
            :email,
            :linkedin,
            :portfolio,
            :cover_letter,
            :resume_original_name,
            :resume_stored_file_name,
            :resume_mime_type,
            :resume_size,
            :resume_path,
            :ip_address,
            :user_agent,
            ' . $nowExpression . '
        )'
    );

    $stmt->execute([
        'job_title' => $payload['jobTitle'],
        'name' => $payload['name'],
        'email' => $payload['email'],
        'linkedin' => $payload['linkedin'],
        'portfolio' => $payload['portfolio'],
        'cover_letter' => $payload['coverLetter'],
        'resume_original_name' => $upload['originalName'],
        'resume_stored_file_name' => $upload['storedFileName'],
        'resume_mime_type' => $upload['mimeType'],
        'resume_size' => $upload['size'],
        'resume_path' => $upload['relativePath'],
        'ip_address' => $ipAddress,
        'user_agent' => $userAgent,
    ]);
}
