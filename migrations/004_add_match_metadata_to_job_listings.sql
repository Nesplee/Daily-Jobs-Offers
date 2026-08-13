ALTER TABLE job_listings
  ADD COLUMN match_score INTEGER,
  ADD COLUMN match_category VARCHAR,
  ADD COLUMN location_incomplete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN foreign_language VARCHAR;
