<?php

declare(strict_types=1);

function now_iso_utc(): string
{
    return gmdate('c');
}

function to_bool(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value)) {
        return $value === 1;
    }
    if (!is_string($value)) {
        return false;
    }

    $normalized = strtolower(trim($value));
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function parse_json_array_field(string $value): array
{
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function sanitize_testimonial_input(array $input): array
{
    return [
        'quote' => as_string($input['quote'] ?? ''),
        'name' => as_string($input['name'] ?? ''),
        'role' => as_string($input['role'] ?? ''),
        'company' => as_string($input['company'] ?? ''),
        'avatar' => as_string($input['avatar'] ?? ''),
        'result' => as_string($input['result'] ?? ''),
        'isActive' => to_bool($input['isActive'] ?? true),
        'sortOrder' => (int) ($input['sortOrder'] ?? 0),
    ];
}

function validate_testimonial_payload(array $payload): array
{
    $errors = [];
    if ($payload['quote'] === '') {
        $errors['quote'] = 'Quote is required.';
    }
    if ($payload['name'] === '') {
        $errors['name'] = 'Name is required.';
    }
    if ($payload['role'] === '') {
        $errors['role'] = 'Role is required.';
    }
    if ($payload['company'] === '') {
        $errors['company'] = 'Company is required.';
    }
    if ($payload['result'] === '') {
        $errors['result'] = 'Result is required.';
    }
    return $errors;
}

function db_testimonial_to_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'quote' => (string) $row['quote'],
        'name' => (string) $row['name'],
        'role' => (string) $row['role'],
        'company' => (string) $row['company'],
        'avatar' => (string) ($row['avatar'] ?? ''),
        'result' => (string) $row['result'],
        'isActive' => (int) ($row['is_active'] ?? 1) === 1,
        'sortOrder' => (int) ($row['sort_order'] ?? 0),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function crm_list_testimonials(): array
{
    $stmt = db()->query('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC');
    $rows = $stmt->fetchAll();
    return array_map('db_testimonial_to_public', is_array($rows) ? $rows : []);
}

function crm_get_testimonial(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM testimonials WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return is_array($row) ? db_testimonial_to_public($row) : null;
}

function crm_create_testimonial(array $input): array
{
    $payload = sanitize_testimonial_input($input);
    $errors = validate_testimonial_payload($payload);
    if (!empty($errors)) {
        json_error('Validation failed.', 400, $errors);
    }

    $stmt = db()->prepare(
        'INSERT INTO testimonials (quote, name, role, company, avatar, result, sort_order, is_active, created_at, updated_at)
         VALUES (:quote, :name, :role, :company, :avatar, :result, :sort_order, :is_active, ' . db_now_expression() . ', ' . db_now_expression() . ')'
    );

    $stmt->execute([
        'quote' => $payload['quote'],
        'name' => $payload['name'],
        'role' => $payload['role'],
        'company' => $payload['company'],
        'avatar' => $payload['avatar'],
        'result' => $payload['result'],
        'sort_order' => $payload['sortOrder'],
        'is_active' => $payload['isActive'] ? 1 : 0,
    ]);

    $id = (int) db()->lastInsertId();
    $item = crm_get_testimonial($id);
    return $item ?? [];
}

function crm_update_testimonial(int $id, array $input): array
{
    $payload = sanitize_testimonial_input($input);
    $errors = validate_testimonial_payload($payload);
    if (!empty($errors)) {
        json_error('Validation failed.', 400, $errors);
    }

    $stmt = db()->prepare(
        'UPDATE testimonials
         SET quote = :quote,
             name = :name,
             role = :role,
             company = :company,
             avatar = :avatar,
             result = :result,
             sort_order = :sort_order,
             is_active = :is_active,
             updated_at = ' . db_now_expression() . '
         WHERE id = :id'
    );

    $stmt->execute([
        'id' => $id,
        'quote' => $payload['quote'],
        'name' => $payload['name'],
        'role' => $payload['role'],
        'company' => $payload['company'],
        'avatar' => $payload['avatar'],
        'result' => $payload['result'],
        'sort_order' => $payload['sortOrder'],
        'is_active' => $payload['isActive'] ? 1 : 0,
    ]);

    if ($stmt->rowCount() === 0 && crm_get_testimonial($id) === null) {
        json_error('Testimonial not found.', 404);
    }

    $item = crm_get_testimonial($id);
    return $item ?? [];
}

function crm_delete_testimonial(int $id): void
{
    $stmt = db()->prepare('DELETE FROM testimonials WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if ($stmt->rowCount() < 1) {
        json_error('Testimonial not found.', 404);
    }
}

function sanitize_portfolio_results(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $results = [];
    foreach ($value as $item) {
        if (!is_array($item)) {
            continue;
        }

        $metric = as_string($item['metric'] ?? '');
        $label = as_string($item['label'] ?? '');
        if ($metric === '' || $label === '') {
            continue;
        }

        $results[] = [
            'metric' => $metric,
            'label' => $label,
        ];
    }

    return $results;
}

function sanitize_portfolio_input(array $input): array
{
    $tagsInput = $input['tags'] ?? [];
    if (is_string($tagsInput)) {
        $tagsInput = array_filter(array_map('trim', explode(',', $tagsInput)));
    }

    $tags = [];
    if (is_array($tagsInput)) {
        foreach ($tagsInput as $tag) {
            $clean = as_string(is_string($tag) ? $tag : '');
            if ($clean !== '') {
                $tags[] = $clean;
            }
        }
    }

    return [
        'slug' => as_string($input['slug'] ?? ''),
        'title' => as_string($input['title'] ?? ''),
        'category' => as_string($input['category'] ?? ''),
        'emoji' => as_string($input['emoji'] ?? ''),
        'tags' => $tags,
        'image' => as_string($input['image'] ?? ''),
        'description' => as_string($input['description'] ?? ''),
        'result' => as_string($input['result'] ?? ''),
        'overview' => as_string($input['overview'] ?? ''),
        'challenge' => as_string($input['challenge'] ?? ''),
        'solution' => as_string($input['solution'] ?? ''),
        'timeline' => as_string($input['timeline'] ?? ''),
        'team' => as_string($input['team'] ?? ''),
        'services' => as_string($input['services'] ?? ''),
        'featured' => to_bool($input['featured'] ?? false),
        'isActive' => to_bool($input['isActive'] ?? true),
        'sortOrder' => (int) ($input['sortOrder'] ?? 0),
        'results' => sanitize_portfolio_results($input['results'] ?? []),
    ];
}

function validate_portfolio_payload(array $payload, ?int $ignoreId = null): array
{
    $errors = [];

    $required = [
        'slug' => 'Slug is required.',
        'title' => 'Title is required.',
        'category' => 'Category is required.',
        'description' => 'Description is required.',
        'result' => 'Result is required.',
        'overview' => 'Overview is required.',
        'challenge' => 'Challenge is required.',
        'solution' => 'Solution is required.',
        'timeline' => 'Timeline is required.',
        'team' => 'Team is required.',
        'services' => 'Services is required.',
    ];

    foreach ($required as $field => $message) {
        if ($payload[$field] === '') {
            $errors[$field] = $message;
        }
    }

    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $payload['slug'])) {
        $errors['slug'] = 'Slug must use lowercase letters, numbers, and hyphens only.';
    }

    if (count($payload['results']) < 1) {
        $errors['results'] = 'At least one metric result is required.';
    }

    $stmt = db()->prepare('SELECT id FROM portfolio_projects WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $payload['slug']]);
    $existing = $stmt->fetch();
    if (is_array($existing)) {
        $existingId = (int) ($existing['id'] ?? 0);
        if ($ignoreId === null || $existingId !== $ignoreId) {
            $errors['slug'] = 'Slug must be unique.';
        }
    }

    return $errors;
}

function db_portfolio_rows_to_public(array $projectRows, array $resultRows): array
{
    $resultsMap = [];
    foreach ($resultRows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $projectId = (int) ($row['project_id'] ?? 0);
        if (!isset($resultsMap[$projectId])) {
            $resultsMap[$projectId] = [];
        }
        $resultsMap[$projectId][] = [
            'metric' => (string) ($row['metric'] ?? ''),
            'label' => (string) ($row['label'] ?? ''),
        ];
    }

    $items = [];
    foreach ($projectRows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $id = (int) ($row['id'] ?? 0);
        $items[] = [
            'id' => $id,
            'slug' => (string) ($row['slug'] ?? ''),
            'title' => (string) ($row['title'] ?? ''),
            'category' => (string) ($row['category'] ?? ''),
            'emoji' => (string) ($row['emoji'] ?? ''),
            'tags' => parse_json_array_field((string) ($row['tags_json'] ?? '[]')),
            'image' => (string) ($row['image'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'result' => (string) ($row['result'] ?? ''),
            'overview' => (string) ($row['overview'] ?? ''),
            'challenge' => (string) ($row['challenge'] ?? ''),
            'solution' => (string) ($row['solution'] ?? ''),
            'results' => $resultsMap[$id] ?? [],
            'timeline' => (string) ($row['timeline'] ?? ''),
            'team' => (string) ($row['team'] ?? ''),
            'services' => (string) ($row['services'] ?? ''),
            'featured' => (int) ($row['featured'] ?? 0) === 1,
            'isActive' => (int) ($row['is_active'] ?? 1) === 1,
            'sortOrder' => (int) ($row['sort_order'] ?? 0),
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'updatedAt' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    return $items;
}

function crm_list_portfolio_projects(): array
{
    $projectRows = db()->query('SELECT * FROM portfolio_projects ORDER BY sort_order ASC, id DESC')->fetchAll();
    $resultRows = db()->query('SELECT * FROM portfolio_results ORDER BY sort_order ASC, id ASC')->fetchAll();
    return db_portfolio_rows_to_public(is_array($projectRows) ? $projectRows : [], is_array($resultRows) ? $resultRows : []);
}

function crm_get_portfolio_project(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM portfolio_projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $project = $stmt->fetch();
    if (!is_array($project)) {
        return null;
    }

    $resultStmt = db()->prepare('SELECT * FROM portfolio_results WHERE project_id = :project_id ORDER BY sort_order ASC, id ASC');
    $resultStmt->execute(['project_id' => $id]);
    $resultRows = $resultStmt->fetchAll();

    $items = db_portfolio_rows_to_public([$project], is_array($resultRows) ? $resultRows : []);
    return $items[0] ?? null;
}

function crm_upsert_portfolio_results(int $projectId, array $results): void
{
    $deleteStmt = db()->prepare('DELETE FROM portfolio_results WHERE project_id = :project_id');
    $deleteStmt->execute(['project_id' => $projectId]);

    if (count($results) < 1) {
        return;
    }

    $insertStmt = db()->prepare(
        'INSERT INTO portfolio_results (project_id, metric, label, sort_order, created_at, updated_at)
         VALUES (:project_id, :metric, :label, :sort_order, ' . db_now_expression() . ', ' . db_now_expression() . ')'
    );

    foreach ($results as $index => $item) {
        $insertStmt->execute([
            'project_id' => $projectId,
            'metric' => $item['metric'],
            'label' => $item['label'],
            'sort_order' => $index,
        ]);
    }
}

function crm_create_portfolio_project(array $input): array
{
    $payload = sanitize_portfolio_input($input);
    $errors = validate_portfolio_payload($payload);
    if (!empty($errors)) {
        json_error('Validation failed.', 400, $errors);
    }

    $stmt = db()->prepare(
        'INSERT INTO portfolio_projects (
            slug, title, category, emoji, tags_json, image, description, result,
            overview, challenge, solution, timeline, team, services,
            featured, is_active, sort_order, created_at, updated_at
        ) VALUES (
            :slug, :title, :category, :emoji, :tags_json, :image, :description, :result,
            :overview, :challenge, :solution, :timeline, :team, :services,
            :featured, :is_active, :sort_order, ' . db_now_expression() . ', ' . db_now_expression() . '
        )'
    );

    $stmt->execute([
        'slug' => $payload['slug'],
        'title' => $payload['title'],
        'category' => $payload['category'],
        'emoji' => $payload['emoji'],
        'tags_json' => json_encode($payload['tags'], JSON_UNESCAPED_SLASHES),
        'image' => $payload['image'],
        'description' => $payload['description'],
        'result' => $payload['result'],
        'overview' => $payload['overview'],
        'challenge' => $payload['challenge'],
        'solution' => $payload['solution'],
        'timeline' => $payload['timeline'],
        'team' => $payload['team'],
        'services' => $payload['services'],
        'featured' => $payload['featured'] ? 1 : 0,
        'is_active' => $payload['isActive'] ? 1 : 0,
        'sort_order' => $payload['sortOrder'],
    ]);

    $projectId = (int) db()->lastInsertId();
    crm_upsert_portfolio_results($projectId, $payload['results']);

    $item = crm_get_portfolio_project($projectId);
    return $item ?? [];
}

function crm_update_portfolio_project(int $id, array $input): array
{
    $payload = sanitize_portfolio_input($input);
    $errors = validate_portfolio_payload($payload, $id);
    if (!empty($errors)) {
        json_error('Validation failed.', 400, $errors);
    }

    $stmt = db()->prepare(
        'UPDATE portfolio_projects
         SET slug = :slug,
             title = :title,
             category = :category,
             emoji = :emoji,
             tags_json = :tags_json,
             image = :image,
             description = :description,
             result = :result,
             overview = :overview,
             challenge = :challenge,
             solution = :solution,
             timeline = :timeline,
             team = :team,
             services = :services,
             featured = :featured,
             is_active = :is_active,
             sort_order = :sort_order,
             updated_at = ' . db_now_expression() . '
         WHERE id = :id'
    );

    $stmt->execute([
        'id' => $id,
        'slug' => $payload['slug'],
        'title' => $payload['title'],
        'category' => $payload['category'],
        'emoji' => $payload['emoji'],
        'tags_json' => json_encode($payload['tags'], JSON_UNESCAPED_SLASHES),
        'image' => $payload['image'],
        'description' => $payload['description'],
        'result' => $payload['result'],
        'overview' => $payload['overview'],
        'challenge' => $payload['challenge'],
        'solution' => $payload['solution'],
        'timeline' => $payload['timeline'],
        'team' => $payload['team'],
        'services' => $payload['services'],
        'featured' => $payload['featured'] ? 1 : 0,
        'is_active' => $payload['isActive'] ? 1 : 0,
        'sort_order' => $payload['sortOrder'],
    ]);

    if ($stmt->rowCount() === 0 && crm_get_portfolio_project($id) === null) {
        json_error('Portfolio project not found.', 404);
    }

    crm_upsert_portfolio_results($id, $payload['results']);
    $item = crm_get_portfolio_project($id);
    return $item ?? [];
}

function crm_delete_portfolio_project(int $id): void
{
    $deleteResults = db()->prepare('DELETE FROM portfolio_results WHERE project_id = :project_id');
    $deleteResults->execute(['project_id' => $id]);

    $deleteProject = db()->prepare('DELETE FROM portfolio_projects WHERE id = :id');
    $deleteProject->execute(['id' => $id]);
    if ($deleteProject->rowCount() < 1) {
        json_error('Portfolio project not found.', 404);
    }
}

function crm_lead_type_table_map(): array
{
    return [
        'contact' => 'contact_leads',
        'newsletter' => 'newsletter_subscribers',
        'careers' => 'career_applications',
    ];
}

function crm_validate_lead_type(string $type): string
{
    $normalized = strtolower(trim($type));
    $map = crm_lead_type_table_map();
    if (!isset($map[$normalized])) {
        json_error('Invalid lead type.', 400);
    }

    return $normalized;
}

function crm_valid_lead_statuses(): array
{
    return ['new', 'in_progress', 'qualified', 'closed'];
}

function crm_valid_lead_priorities(): array
{
    return ['low', 'medium', 'high'];
}

function crm_validate_lead_update(array $payload): array
{
    $validated = [];

    if (array_key_exists('status', $payload)) {
        $status = strtolower(as_string($payload['status']));
        if (!in_array($status, crm_valid_lead_statuses(), true)) {
            json_error('Validation failed.', 400, ['status' => 'Invalid status.']);
        }
        $validated['status'] = $status;
    }

    if (array_key_exists('priority', $payload)) {
        $priority = strtolower(as_string($payload['priority']));
        if (!in_array($priority, crm_valid_lead_priorities(), true)) {
            json_error('Validation failed.', 400, ['priority' => 'Invalid priority.']);
        }
        $validated['priority'] = $priority;
    }

    if (array_key_exists('assignedTo', $payload)) {
        $value = $payload['assignedTo'];
        $assignedTo = null;
        if ($value !== null && $value !== '') {
            $assignedTo = (int) $value;
            if ($assignedTo <= 0 || admin_find_user_by_id($assignedTo) === null) {
                json_error('Validation failed.', 400, ['assignedTo' => 'Assigned user does not exist.']);
            }
        }
        $validated['assigned_to'] = $assignedTo;
    }

    if (array_key_exists('nextFollowupAt', $payload)) {
        $raw = as_string((string) $payload['nextFollowupAt']);
        if ($raw === '') {
            $validated['next_followup_at'] = null;
        } else {
            $ts = strtotime($raw);
            if ($ts === false) {
                json_error('Validation failed.', 400, ['nextFollowupAt' => 'Invalid follow-up datetime.']);
            }
            $validated['next_followup_at'] = gmdate('Y-m-d H:i:s', $ts);
        }
    }

    return $validated;
}

function crm_build_lead_union_query(): string
{
    return "
        SELECT 'contact' AS lead_type, id, name, email, company AS subject, message AS details,
               status, priority, assigned_to, next_followup_at, created_at, updated_at
        FROM contact_leads
        UNION ALL
        SELECT 'newsletter' AS lead_type, id, '' AS name, email, '' AS subject, '' AS details,
               status, priority, assigned_to, next_followup_at, created_at, updated_at
        FROM newsletter_subscribers
        UNION ALL
        SELECT 'careers' AS lead_type, id, name, email, job_title AS subject, cover_letter AS details,
               status, priority, assigned_to, next_followup_at, created_at, updated_at
        FROM career_applications
    ";
}

function crm_list_leads(array $filters = []): array
{
    $sql = 'SELECT * FROM (' . crm_build_lead_union_query() . ') leads WHERE 1=1';
    $params = [];

    $type = as_string($filters['type'] ?? '');
    if ($type !== '') {
        $type = crm_validate_lead_type($type);
        $sql .= ' AND lead_type = :type';
        $params['type'] = $type;
    }

    $status = strtolower(as_string($filters['status'] ?? ''));
    if ($status !== '') {
        if (!in_array($status, crm_valid_lead_statuses(), true)) {
            json_error('Validation failed.', 400, ['status' => 'Invalid status filter.']);
        }
        $sql .= ' AND status = :status';
        $params['status'] = $status;
    }

    $priority = strtolower(as_string($filters['priority'] ?? ''));
    if ($priority !== '') {
        if (!in_array($priority, crm_valid_lead_priorities(), true)) {
            json_error('Validation failed.', 400, ['priority' => 'Invalid priority filter.']);
        }
        $sql .= ' AND priority = :priority';
        $params['priority'] = $priority;
    }

    $assignedTo = as_string($filters['assignedTo'] ?? '');
    if ($assignedTo !== '') {
        $sql .= ' AND assigned_to = :assigned_to';
        $params['assigned_to'] = (int) $assignedTo;
    }

    $search = as_string($filters['search'] ?? '');
    if ($search !== '') {
        $sql .= ' AND (name LIKE :search OR email LIKE :search OR subject LIKE :search OR details LIKE :search)';
        $params['search'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY created_at DESC';

    $limit = max(1, min(200, (int) ($filters['limit'] ?? 50)));
    $offset = max(0, (int) ($filters['offset'] ?? 0));

    $sql .= ' LIMIT :limit OFFSET :offset';

    $stmt = db()->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();

    $items = [];
    foreach ((array) $rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $items[] = [
            'leadType' => (string) $row['lead_type'],
            'id' => (int) $row['id'],
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'subject' => (string) ($row['subject'] ?? ''),
            'details' => (string) ($row['details'] ?? ''),
            'status' => (string) ($row['status'] ?? 'new'),
            'priority' => (string) ($row['priority'] ?? 'medium'),
            'assignedTo' => $row['assigned_to'] !== null ? (int) $row['assigned_to'] : null,
            'nextFollowupAt' => (string) ($row['next_followup_at'] ?? ''),
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'updatedAt' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    return $items;
}

function crm_get_lead(string $type, int $id): ?array
{
    $type = crm_validate_lead_type($type);
    $table = crm_lead_type_table_map()[$type];
    $stmt = db()->prepare('SELECT * FROM ' . $table . ' WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return null;
    }

    $item = [
        'leadType' => $type,
        'id' => (int) $row['id'],
        'name' => '',
        'email' => (string) ($row['email'] ?? ''),
        'subject' => '',
        'details' => '',
        'status' => (string) ($row['status'] ?? 'new'),
        'priority' => (string) ($row['priority'] ?? 'medium'),
        'assignedTo' => $row['assigned_to'] !== null ? (int) $row['assigned_to'] : null,
        'nextFollowupAt' => (string) ($row['next_followup_at'] ?? ''),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];

    if ($type === 'contact') {
        $item['name'] = (string) ($row['name'] ?? '');
        $item['subject'] = (string) ($row['company'] ?? '');
        $item['details'] = (string) ($row['message'] ?? '');
    } elseif ($type === 'newsletter') {
        $item['subject'] = 'Newsletter';
    } elseif ($type === 'careers') {
        $item['name'] = (string) ($row['name'] ?? '');
        $item['subject'] = (string) ($row['job_title'] ?? '');
        $item['details'] = (string) ($row['cover_letter'] ?? '');
    }

    $item['notes'] = crm_list_lead_notes($type, $id);
    return $item;
}

function crm_update_lead(string $type, int $id, array $payload): array
{
    $type = crm_validate_lead_type($type);
    $table = crm_lead_type_table_map()[$type];

    $validated = crm_validate_lead_update($payload);
    if (empty($validated)) {
        json_error('No fields to update.', 400);
    }

    $setParts = [];
    $params = ['id' => $id];

    foreach ($validated as $column => $value) {
        $setParts[] = $column . ' = :' . $column;
        $params[$column] = $value;
    }

    $setParts[] = 'updated_at = ' . db_now_expression();

    $sql = 'UPDATE ' . $table . ' SET ' . implode(', ', $setParts) . ' WHERE id = :id';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() < 1) {
        $existsStmt = db()->prepare('SELECT id FROM ' . $table . ' WHERE id = :id LIMIT 1');
        $existsStmt->execute(['id' => $id]);
        if (!is_array($existsStmt->fetch())) {
            json_error('Lead not found.', 404);
        }
    }

    $lead = crm_get_lead($type, $id);
    return $lead ?? [];
}

function crm_list_lead_notes(string $type, int $leadId): array
{
    $stmt = db()->prepare(
        'SELECT n.id, n.note, n.created_at, u.id AS author_id, u.username, u.full_name
         FROM lead_notes n
         LEFT JOIN admin_users u ON u.id = n.author_user_id
         WHERE n.lead_type = :lead_type AND n.lead_id = :lead_id
         ORDER BY n.created_at DESC, n.id DESC'
    );
    $stmt->execute([
        'lead_type' => $type,
        'lead_id' => $leadId,
    ]);

    $rows = $stmt->fetchAll();
    $items = [];
    foreach ((array) $rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $items[] = [
            'id' => (int) $row['id'],
            'note' => (string) ($row['note'] ?? ''),
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'author' => [
                'id' => $row['author_id'] !== null ? (int) $row['author_id'] : null,
                'username' => (string) ($row['username'] ?? ''),
                'fullName' => (string) ($row['full_name'] ?? ''),
            ],
        ];
    }

    return $items;
}

function crm_add_lead_note(string $type, int $leadId, int $authorUserId, string $note): array
{
    $type = crm_validate_lead_type($type);
    $note = as_string($note);
    if ($note === '') {
        json_error('Validation failed.', 400, ['note' => 'Note is required.']);
    }

    $lead = crm_get_lead($type, $leadId);
    if ($lead === null) {
        json_error('Lead not found.', 404);
    }

    $stmt = db()->prepare(
        'INSERT INTO lead_notes (lead_type, lead_id, author_user_id, note, created_at)
         VALUES (:lead_type, :lead_id, :author_user_id, :note, ' . db_now_expression() . ')'
    );

    $stmt->execute([
        'lead_type' => $type,
        'lead_id' => $leadId,
        'author_user_id' => $authorUserId,
        'note' => $note,
    ]);

    $notes = crm_list_lead_notes($type, $leadId);
    return $notes[0] ?? [];
}

function crm_lead_dashboard_counters(): array
{
    $todayDate = gmdate('Y-m-d');

    $all = crm_list_leads(['limit' => 200, 'offset' => 0]);
    $source = [
        'contact' => 0,
        'newsletter' => 0,
        'careers' => 0,
    ];

    $newToday = 0;
    $pendingFollowups = 0;

    foreach ($all as $lead) {
        $type = (string) ($lead['leadType'] ?? '');
        if (isset($source[$type])) {
            $source[$type] += 1;
        }

        if ((string) ($lead['status'] ?? '') === 'new' && str_starts_with((string) ($lead['createdAt'] ?? ''), $todayDate)) {
            $newToday += 1;
        }

        $followup = as_string((string) ($lead['nextFollowupAt'] ?? ''));
        if ($followup !== '') {
            $ts = strtotime($followup);
            if ($ts !== false && $ts <= time()) {
                $pendingFollowups += 1;
            }
        }
    }

    return [
        'newToday' => $newToday,
        'pendingFollowups' => $pendingFollowups,
        'bySource' => $source,
    ];
}

function crm_list_users(): array
{
    admin_ensure_bootstrap_user();
    $stmt = db()->query('SELECT id, username, email, full_name, role, is_active, created_at, updated_at FROM admin_users ORDER BY created_at DESC, id DESC');
    $rows = $stmt->fetchAll();

    $users = [];
    foreach ((array) $rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $users[] = admin_public_user($row);
    }

    return $users;
}

function crm_create_user(array $input): array
{
    $username = as_string($input['username'] ?? '');
    $email = as_string($input['email'] ?? '');
    $fullName = as_string($input['fullName'] ?? '');
    $role = normalize_admin_role(as_string($input['role'] ?? 'sales'));
    $password = (string) ($input['password'] ?? '');
    $isActive = !array_key_exists('isActive', $input) ? true : to_bool($input['isActive']);

    $errors = [];
    if ($username === '') {
        $errors['username'] = 'Username is required.';
    }
    if ($email === '' || !is_valid_email($email)) {
        $errors['email'] = 'Valid email is required.';
    }
    if ($fullName === '') {
        $errors['fullName'] = 'Full name is required.';
    }
    if (strlen($password) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    }

    if (!empty($errors)) {
        json_error('Validation failed.', 400, $errors);
    }

    $existsStmt = db()->prepare('SELECT id FROM admin_users WHERE username = :username LIMIT 1');
    $existsStmt->execute(['username' => $username]);
    if (is_array($existsStmt->fetch())) {
        json_error('Validation failed.', 400, ['username' => 'Username already exists.']);
    }

    $insert = db()->prepare(
        'INSERT INTO admin_users (username, email, full_name, role, password_hash, is_active, created_at, updated_at)
         VALUES (:username, :email, :full_name, :role, :password_hash, :is_active, ' . db_now_expression() . ', ' . db_now_expression() . ')'
    );

    $insert->execute([
        'username' => $username,
        'email' => $email,
        'full_name' => $fullName,
        'role' => $role,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'is_active' => $isActive ? 1 : 0,
    ]);

    $id = (int) db()->lastInsertId();
    $user = admin_find_user_by_id($id);
    if ($user === null) {
        json_error('Failed to create user.', 500);
    }

    return admin_public_user($user);
}

function crm_update_user_status(int $id, bool $isActive): array
{
    $stmt = db()->prepare('UPDATE admin_users SET is_active = :is_active, updated_at = ' . db_now_expression() . ' WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'is_active' => $isActive ? 1 : 0,
    ]);

    if ($stmt->rowCount() < 1) {
        $user = admin_find_user_by_id($id);
        if ($user === null) {
            json_error('User not found.', 404);
        }
    }

    $user = admin_find_user_by_id($id);
    if ($user === null) {
        json_error('User not found.', 404);
    }

    if (!$isActive) {
        $deleteSessions = db()->prepare('DELETE FROM admin_sessions WHERE user_id = :user_id');
        $deleteSessions->execute(['user_id' => $id]);
    }

    return admin_public_user($user);
}
