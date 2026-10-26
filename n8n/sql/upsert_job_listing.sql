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
  -- Fusion et non remplacement : une offre déjà connue repasse sans être
  -- retraduite, ses clés title_original et description_fr doivent survivre.
  -- description_full vient du workflow enrich_descriptions : un null renvoyé
  -- par la recherche (Jooble, Adzuna) ne doit pas l'effacer.
  raw_extra = job_listings.raw_extra || CASE
    WHEN EXCLUDED.raw_extra->>'description_full' IS NULL THEN EXCLUDED.raw_extra - 'description_full'
    ELSE EXCLUDED.raw_extra
  END,
  match_score = EXCLUDED.match_score,
  match_category = EXCLUDED.match_category,
  location_incomplete = EXCLUDED.location_incomplete,
  foreign_language = EXCLUDED.foreign_language
RETURNING id, (xmax = 0) AS is_new_row;
