-- Annonces dont la description complète reste à récupérer sur la page de
-- détail (workflow enrich_descriptions). Jooble, Adzuna (403 hors
-- navigateur) et Indeed (déjà complet) n'en ont pas : voir
-- borrow_duplicate_descriptions.sql. Trois essais au plus par annonce, pour
-- qu'une offre retirée (404) ne soit pas redemandée chaque jour.
SELECT id, source, source_id, url
FROM job_listings
WHERE coalesce(raw_extra->>'description_full', '') = ''
  AND source IN ('linkedin.com', 'job-room.ch', 'cern.ch', 'jobs.ch', 'jobup.ch', 'srgssr.ch', 'nestle.com', 'swissdevjobs.ch')
  AND coalesce((raw_extra->>'description_fetch_attempts')::int, 0) < 3
ORDER BY created_at DESC
LIMIT 200;
