INSERT INTO job_listings (
  source, source_id, title, company, url, location,
  keywords_matched, search_profile_id, posted_at, raw_extra,
  match_score, match_category, location_incomplete, foreign_language
) VALUES (
  :source, :source_id, :title, :company, :url, :location,
  :keywords_matched, :search_profile_id, :posted_at, :raw_extra,
  :match_score, :match_category, :location_incomplete, :foreign_language
)
ON CONFLICT (source, source_id) DO UPDATE SET
  last_checked_at = now(),
  raw_extra = EXCLUDED.raw_extra,
  match_score = EXCLUDED.match_score,
  match_category = EXCLUDED.match_category,
  location_incomplete = EXCLUDED.location_incomplete,
  foreign_language = EXCLUDED.foreign_language
RETURNING id, (xmax = 0) AS is_new_row;
