CREATE TABLE IF NOT EXISTS contact_leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL DEFAULT '',
  service VARCHAR(120) NOT NULL DEFAULT '',
  budget VARCHAR(120) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_contact_created_at (created_at),
  INDEX idx_contact_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_newsletter_created_at (created_at),
  INDEX idx_newsletter_email (email)
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
  ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_careers_created_at (created_at),
  INDEX idx_careers_email (email),
  INDEX idx_careers_job_title (job_title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key VARCHAR(255) NOT NULL,
  window_start BIGINT UNSIGNED NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (bucket_key, window_start),
  INDEX idx_rate_limit_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
