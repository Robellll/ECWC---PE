-- Compact audit trail (one-line summaries, deep-link hrefs)

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_email TEXT NOT NULL DEFAULT '',
  user_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  href TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON audit_log (module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id, created_at DESC);
