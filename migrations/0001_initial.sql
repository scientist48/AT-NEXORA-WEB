-- AT NEXORA Technologies — inquiry management schema
-- Apply with: npx wrangler d1 migrations apply at-nexora-inquiries --remote
-- Wrangler records applied migrations in the d1_migrations table, and every
-- statement here is idempotent (IF NOT EXISTS) so re-running is safe.

-- Project enquiries submitted through the public contact form.
CREATE TABLE IF NOT EXISTS inquiries (
  id          TEXT PRIMARY KEY,                        -- e.g. NX-7K3P9Q2M
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  email       TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  company     TEXT NOT NULL DEFAULT '' CHECK (length(company) <= 120),
  service     TEXT NOT NULL CHECK (length(service) <= 80),
  budget      TEXT NOT NULL CHECK (length(budget) <= 80),
  message     TEXT NOT NULL CHECK (length(message) BETWEEN 20 AND 4000),
  consent     INTEGER NOT NULL DEFAULT 1 CHECK (consent IN (0, 1)),
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'in_progress', 'completed', 'archived')),
  notes       TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 10000),
  fingerprint TEXT NOT NULL,                           -- SHA-256 of email + message, for duplicate detection
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at        ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created    ON inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_service_created   ON inquiries (service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email             ON inquiries (email);
CREATE INDEX IF NOT EXISTS idx_inquiries_fingerprint       ON inquiries (fingerprint, created_at);

-- Admin sessions. Only a SHA-256 hash of the session token is stored.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash   TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  csrf_token   TEXT NOT NULL,
  created_at   INTEGER NOT NULL,                       -- epoch milliseconds
  expires_at   INTEGER NOT NULL,                       -- absolute expiry
  last_seen_at INTEGER NOT NULL                        -- idle-timeout tracking
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);

-- Fixed-window counters for contact-form and login rate limiting.
-- Keys contain hashed IPs, never raw addresses.
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL                            -- epoch milliseconds
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_at);
