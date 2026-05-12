CREATE TABLE IF NOT EXISTS contact_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to INTEGER,
  next_followup_at TEXT,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_leads(email);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to INTEGER,
  next_followup_at TEXT,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to INTEGER,
  next_followup_at TEXT,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  result TEXT NOT NULL,
  overview TEXT NOT NULL,
  challenge TEXT NOT NULL,
  solution TEXT NOT NULL,
  timeline TEXT NOT NULL,
  team TEXT NOT NULL,
  services TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  metric TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_type TEXT NOT NULL,
  lead_id INTEGER NOT NULL,
  author_user_id INTEGER,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
