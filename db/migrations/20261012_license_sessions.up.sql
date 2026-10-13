-- Per-license activity telemetry: one row per contiguous usage session
-- on a device. Fed (best-effort) by LicenseService.Verify/Activate —
-- a verify gap larger than the session window opens a new row, so the
-- row count approximates "times the app was opened".
CREATE TABLE license_sessions (
    id           TEXT PRIMARY KEY,
    license_id   TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    identifier   TEXT NOT NULL,
    ip_address   TEXT NOT NULL DEFAULT '',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verify_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_license_sessions_license ON license_sessions(license_id, last_seen_at DESC);
CREATE INDEX idx_license_sessions_open ON license_sessions(license_id, identifier, last_seen_at DESC);
