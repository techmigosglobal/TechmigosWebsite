CREATE TABLE IF NOT EXISTS contact_leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL DEFAULT '',
  service VARCHAR(120) NOT NULL DEFAULT '',
  budget VARCHAR(120) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  assigned_to BIGINT UNSIGNED NULL,
  next_followup_at DATETIME NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_contact_created_at (created_at),
  INDEX idx_contact_email (email),
  INDEX idx_contact_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  assigned_to BIGINT UNSIGNED NULL,
  next_followup_at DATETIME NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_newsletter_created_at (created_at),
  INDEX idx_newsletter_email (email),
  INDEX idx_newsletter_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS career_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_title VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  linkedin VARCHAR(512) NOT NULL DEFAULT '',
  portfolio VARCHAR(512) NOT NULL DEFAULT '',
  cover_letter TEXT NOT NULL,
  resume_original_name VARCHAR(255) NOT NULL,
  resume_stored_file_name VARCHAR(255) NOT NULL,
  resume_mime_type VARCHAR(160) NOT NULL,
  resume_size BIGINT UNSIGNED NOT NULL,
  resume_path VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  assigned_to BIGINT UNSIGNED NULL,
  next_followup_at DATETIME NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_careers_created_at (created_at),
  INDEX idx_careers_email (email),
  INDEX idx_careers_job_title (job_title),
  INDEX idx_careers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key VARCHAR(255) NOT NULL,
  window_start BIGINT UNSIGNED NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (bucket_key, window_start),
  INDEX idx_rate_limit_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'sales',
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_admin_users_username (username),
  INDEX idx_admin_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_admin_sessions_token_hash (token_hash),
  INDEX idx_admin_sessions_user_id (user_id),
  INDEX idx_admin_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  metadata_json LONGTEXT NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_admin_activity_logs_user_id (user_id),
  INDEX idx_admin_activity_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote TEXT NOT NULL,
  name VARCHAR(180) NOT NULL,
  role VARCHAR(180) NOT NULL,
  company VARCHAR(180) NOT NULL,
  avatar VARCHAR(512) NOT NULL DEFAULT '',
  result VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_testimonials_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL,
  emoji VARCHAR(32) NOT NULL DEFAULT '',
  tags_json JSON NOT NULL,
  image VARCHAR(512) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  result VARCHAR(255) NOT NULL,
  overview TEXT NOT NULL,
  challenge TEXT NOT NULL,
  solution TEXT NOT NULL,
  timeline VARCHAR(120) NOT NULL,
  team VARCHAR(120) NOT NULL,
  services VARCHAR(255) NOT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_portfolio_projects_slug (slug),
  INDEX idx_portfolio_projects_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  metric VARCHAR(120) NOT NULL,
  label VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_portfolio_results_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_type VARCHAR(32) NOT NULL,
  lead_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_lead_notes_ref (lead_type, lead_id),
  INDEX idx_lead_notes_author (author_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
