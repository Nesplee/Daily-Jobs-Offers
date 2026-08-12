INSERT INTO job_listings (
  source, source_id, title, company, url, location,
  keywords_matched, search_profile_id, posted_at, raw_extra
) VALUES (
  :source, :source_id, :title, :company, :url, :location,
  :keywords_matched, :search_profile_id, :posted_at, :raw_extra
)
ON CONFLICT (source, source_id) DO UPDATE SET
  last_checked_at = now(),
  raw_extra = EXCLUDED.raw_extra
RETURNING id, (xmax = 0) AS is_new_row;
