CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE search_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR NOT NULL,
  keywords      TEXT[] NOT NULL,
  locations     TEXT[] NOT NULL,
  min_salary    INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);
