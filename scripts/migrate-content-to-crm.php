#!/usr/bin/env php
<?php

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$force = in_array('--force', $argv, true);

require_once $rootDir . '/php-backend/api/_core/bootstrap.php';

admin_ensure_bootstrap_user();

$contentFile = $rootDir . '/data/site-content.json';
if (!is_file($contentFile)) {
    fwrite(STDERR, "Missing content file: {$contentFile}\n");
    exit(1);
}

$raw = file_get_contents($contentFile);
if (!is_string($raw) || trim($raw) === '') {
    fwrite(STDERR, "Content file is empty.\n");
    exit(1);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    fwrite(STDERR, "Content file is not valid JSON.\n");
    exit(1);
}

$existingTestimonials = (int) db()->query('SELECT COUNT(*) FROM testimonials')->fetchColumn();
$existingProjects = (int) db()->query('SELECT COUNT(*) FROM portfolio_projects')->fetchColumn();

if (($existingTestimonials > 0 || $existingProjects > 0) && !$force) {
    fwrite(STDOUT, "CRM tables already contain content. Use --force to replace existing testimonials/portfolio.\n");
    exit(0);
}

$pdo = db();
$pdo->beginTransaction();

try {
    if ($force) {
        $pdo->exec('DELETE FROM portfolio_results');
        $pdo->exec('DELETE FROM portfolio_projects');
        $pdo->exec('DELETE FROM testimonials');
    }

    $testimonialCount = 0;
    foreach ((array) ($data['testimonials'] ?? []) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        crm_create_testimonial([
            'quote' => $item['quote'] ?? '',
            'name' => $item['name'] ?? '',
            'role' => $item['role'] ?? '',
            'company' => $item['company'] ?? '',
            'avatar' => $item['avatar'] ?? '',
            'result' => $item['result'] ?? '',
            'sortOrder' => $index,
            'isActive' => true,
        ]);
        $testimonialCount += 1;
    }

    $projectCount = 0;
    foreach ((array) ($data['projects'] ?? []) as $index => $project) {
        if (!is_array($project)) {
            continue;
        }

        crm_create_portfolio_project([
            'slug' => $project['slug'] ?? '',
            'title' => $project['title'] ?? '',
            'category' => $project['category'] ?? '',
            'emoji' => $project['emoji'] ?? '',
            'tags' => is_array($project['tags'] ?? null) ? $project['tags'] : [],
            'image' => $project['image'] ?? '',
            'description' => $project['description'] ?? '',
            'result' => $project['result'] ?? '',
            'overview' => $project['overview'] ?? '',
            'challenge' => $project['challenge'] ?? '',
            'solution' => $project['solution'] ?? '',
            'timeline' => $project['timeline'] ?? '',
            'team' => $project['team'] ?? '',
            'services' => $project['services'] ?? '',
            'featured' => (bool) ($project['featured'] ?? false),
            'isActive' => true,
            'sortOrder' => $index,
            'results' => is_array($project['results'] ?? null) ? $project['results'] : [],
        ]);
        $projectCount += 1;
    }

    $pdo->commit();

    fwrite(STDOUT, "CRM migration complete. Testimonials: {$testimonialCount}, Portfolio projects: {$projectCount}\n");
    exit(0);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fwrite(STDERR, "CRM migration failed: {$error->getMessage()}\n");
    exit(1);
}
