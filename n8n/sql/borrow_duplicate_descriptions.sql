-- Descriptions complètes sans page de détail accessible.
--
-- 1. Indeed : l'acteur Apify renvoie déjà la description entière, rangée
--    dans description_snippet par la normalisation.
UPDATE job_listings
SET raw_extra = raw_extra || jsonb_build_object(
  'description_full', raw_extra->>'description_snippet',
  'description_source', 'search',
  'description_fetched_at', now())
WHERE source = 'indeed.ch'
  AND coalesce(raw_extra->>'description_full', '') = ''
  AND length(raw_extra->>'description_snippet') >= 200;

-- 2. Jooble, Adzuna, et toute annonce dont la page n'a rien donné après
--    3 essais (select_pending_descriptions.sql) : la
--    description d'une autre annonce de la MÊME offre, reconnue avec les
--    règles du digest (select_digest_offers.sql) : employeur normalisé égal
--    par préfixe et intitulé similaire (trigramme >= 0.7), ou intitulé
--    identique et spécifique quand l'employeur est inconnu ou un portail.
--    Seule une description lue sur une page (detail_page, search) est
--    prêtée, jamais une description elle-même empruntée.
WITH candidates AS (
  SELECT id, source, raw_extra, dedup_company(company) AS d_company, dedup_title(title) AS d_title
  FROM job_listings
), donor AS (
  SELECT DISTINCT ON (a.id) a.id, b.source, b.raw_extra->>'description_full' AS description
  FROM candidates a
  JOIN candidates b
    ON b.id <> a.id
   AND coalesce(b.raw_extra->>'description_full', '') <> ''
   AND b.raw_extra->>'description_source' IN ('detail_page', 'search')
   AND (
     ((b.d_company LIKE a.d_company || '%' OR a.d_company LIKE b.d_company || '%')
      AND similarity(a.d_title, b.d_title) >= 0.7)
     OR (a.d_title = b.d_title AND length(a.d_title) >= 20
         AND (a.d_company IS NULL OR b.d_company IS NULL
              OR a.d_company IN ('jobroom', 'jobup') OR b.d_company IN ('jobroom', 'jobup')))
   )
  WHERE coalesce(a.raw_extra->>'description_full', '') = ''
    -- Une annonce dont la propre page reste à lire attend son tour : sa
    -- description vaut mieux que celle d'un doublon.
    AND (a.source NOT IN ('linkedin.com', 'job-room.ch', 'cern.ch', 'jobs.ch', 'jobup.ch', 'srgssr.ch', 'nestle.com', 'swissdevjobs.ch')
         OR coalesce((a.raw_extra->>'description_fetch_attempts')::int, 0) >= 3)
  ORDER BY a.id, similarity(a.d_title, b.d_title) DESC, length(b.raw_extra->>'description_full') DESC
)
UPDATE job_listings j
SET raw_extra = j.raw_extra || jsonb_build_object(
  'description_full', d.description,
  'description_source', 'duplicate:' || d.source,
  'description_fetched_at', now())
FROM donor d
WHERE j.id = d.id;
