CREATE TABLE job_listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source            VARCHAR NOT NULL,
  source_id         VARCHAR NOT NULL,
  title             VARCHAR NOT NULL,
  company           VARCHAR,
  url               VARCHAR NOT NULL,
  location          VARCHAR,
  keywords_matched  TEXT[],
  search_profile_id UUID REFERENCES search_profiles(id),
  posted_at         DATE,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  last_checked_at   TIMESTAMP NOT NULL DEFAULT now(),
  is_read           BOOLEAN NOT NULL DEFAULT false,
  is_favorite       BOOLEAN NOT NULL DEFAULT false,
  notes             TEXT,
  raw_extra         JSONB,
  UNIQUE (source, source_id)
);
