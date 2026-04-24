CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  register_no TEXT UNIQUE,
  pin_code TEXT,
  qr_token TEXT UNIQUE,

  visitor_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  host_name TEXT,
  visit_purpose TEXT,
  scheduled_date TEXT,

  registered_at TEXT NOT NULL,
  checked_in_at TEXT,
  checked_out_at TEXT,

  status TEXT NOT NULL CHECK (status IN ('registered', 'checked_in', 'checked_out', 'void')),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'reception')),
  notes TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  -- Additional fields kept for older records and archive support
  nom TEXT,
  prenom TEXT,
  societe TEXT,
  telephone TEXT,
  personneVisitee TEXT,
  heureArrivee TEXT,
  heureSortie TEXT,
  statut TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_scheduled_date ON visitors(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON visitors(registered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_checked_in_at ON visitors(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_visitors_register_no ON visitors(register_no);
CREATE INDEX IF NOT EXISTS idx_visitors_pin_code ON visitors(pin_code);
CREATE INDEX IF NOT EXISTS idx_visitors_qr_token ON visitors(qr_token);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_heure_arrivee ON visitors(heureArrivee);
CREATE INDEX IF NOT EXISTS idx_visitors_heure_sortie ON visitors(heureSortie);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('site_title', 'Visitor Access', datetime('now')),
  ('welcome_message', 'Pre-register before you arrive.', datetime('now')),
  ('logo_path', '/images/logo.png', datetime('now')),
  ('default_timezone', 'Europe/London', datetime('now')),
  ('pin_length', '6', datetime('now')),
  ('data_retention_days', '365', datetime('now')),
  ('enable_qr_checkin', '1', datetime('now')),
  ('enable_pin_checkin', '1', datetime('now'));
