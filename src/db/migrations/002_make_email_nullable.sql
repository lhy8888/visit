CREATE TABLE visitors_new (
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

  nom TEXT,
  prenom TEXT,
  societe TEXT,
  telephone TEXT,
  personneVisitee TEXT,
  heureArrivee TEXT,
  heureSortie TEXT,
  statut TEXT
);

INSERT INTO visitors_new (
  id,
  register_no,
  pin_code,
  qr_token,
  visitor_name,
  company,
  email,
  phone,
  host_name,
  visit_purpose,
  scheduled_date,
  registered_at,
  checked_in_at,
  checked_out_at,
  status,
  source,
  notes,
  created_at,
  updated_at,
  nom,
  prenom,
  societe,
  telephone,
  personneVisitee,
  heureArrivee,
  heureSortie,
  statut
)
SELECT
  id,
  register_no,
  pin_code,
  qr_token,
  visitor_name,
  company,
  email,
  phone,
  host_name,
  visit_purpose,
  scheduled_date,
  registered_at,
  checked_in_at,
  checked_out_at,
  status,
  source,
  notes,
  created_at,
  updated_at,
  nom,
  prenom,
  societe,
  telephone,
  personneVisitee,
  heureArrivee,
  heureSortie,
  statut
FROM visitors;

DROP TABLE visitors;
ALTER TABLE visitors_new RENAME TO visitors;

CREATE INDEX IF NOT EXISTS idx_visitors_scheduled_date ON visitors(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_register_no ON visitors(register_no);
CREATE INDEX IF NOT EXISTS idx_visitors_pin_code ON visitors(pin_code);
CREATE INDEX IF NOT EXISTS idx_visitors_qr_token ON visitors(qr_token);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON visitors(registered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_checked_in_at ON visitors(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_visitors_arrival ON visitors(heureArrivee);
CREATE INDEX IF NOT EXISTS idx_visitors_departure ON visitors(heureSortie);
