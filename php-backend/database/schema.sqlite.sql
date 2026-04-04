CREATE TABLE IF NOT EXISTS contact_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_leads(email);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON newsletter_subscribers(created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

CREATE TABLE IF NOT EXISTS career_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin TEXT NOT NULL DEFAULT '',
  portfolio TEXT NOT NULL DEFAULT '',
  cover_letter TEXT NOT NULL,
  resume_original_name TEXT NOT NULL,
  resume_stored_file_name TEXT NOT NULL,
  resume_mime_type TEXT NOT NULL,
  resume_size INTEGER NOT NULL,
  resume_path TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_careers_created_at ON career_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_careers_email ON career_applications(email);
CREATE INDEX IF NOT EXISTS idx_careers_job_title ON career_applications(job_title);

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_counters(window_start);
