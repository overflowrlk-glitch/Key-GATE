-- Custom license-key prefix per product ("FAST" -> FAST-XXXXXXXX-...).
-- Empty string = default "KG".
ALTER TABLE products ADD COLUMN key_prefix TEXT NOT NULL DEFAULT '';

-- Validity window anchored at the FIRST device activation (days).
-- 0 = off. Trial plans also anchor their trial_days at activation
-- instead of at creation (see service.Activate / anchorLicenseClock).
ALTER TABLE plans ADD COLUMN activation_days INTEGER NOT NULL DEFAULT 0;
