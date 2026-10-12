-- Verdict sur les offres retenues par "Filter by profile", AVANT traduction :
-- DeepL coûte 2 appels et 2,2 s par offre, et la plupart des offres d'un jour
-- étaient déjà là la veille. :incoming est un tableau JSON
-- [{k, source, source_id, title, company, score}] ; une ligne par offre :
--   known     : même (source, source_id) déjà en base, donc déjà traduite ;
--   duplicate : offre nouvelle, mais doublon d'une offre en base ou d'une
--               offre mieux notée du même lot, à écarter sans la traduire.
--
-- La règle "même offre" est celle de n8n/sql/select_digest_offers.sql (à
-- garder alignée), appliquée ici aux intitulés ORIGINAUX : en base, title est
-- traduit et l'original est dans raw_extra.title_original. Un doublon dans une
-- autre langue passe donc ce filtre, est traduit, puis écarté par le digest.
WITH incoming AS (
  SELECT (e->>'k')::int AS k, e->>'source' AS source, e->>'source_id' AS source_id,
         coalesce((e->>'score')::int, 0) AS score,
         dedup_company(e->>'company') AS d_company, dedup_title(e->>'title') AS d_title
  FROM jsonb_array_elements(:incoming::jsonb) AS e
), stored AS (
  SELECT j.id, j.source, j.source_id, j.created_at,
         dedup_company(j.company) AS d_company,
         dedup_title(coalesce(j.raw_extra->>'title_original', j.title)) AS d_title
  FROM job_listings j
), known AS (
  SELECT i.k
  FROM incoming i
  JOIN stored s ON s.source = i.source AND s.source_id = i.source_id
), fresh AS (
  SELECT i.* FROM incoming i WHERE i.k NOT IN (SELECT k FROM known)
), stored_duplicates AS (
  SELECT f.k, s.id
  FROM fresh f
  JOIN stored s
    ON (
     ((s.d_company LIKE f.d_company || '%' OR f.d_company LIKE s.d_company || '%')
      AND similarity(f.d_title, s.d_title) >= 0.7)
     OR (f.d_title = s.d_title AND length(f.d_title) >= 20
         AND (f.d_company IS NULL OR s.d_company IS NULL
              OR f.d_company IN ('jobroom', 'jobup') OR s.d_company IN ('jobroom', 'jobup')))
   )
   AND NOT (f.source = s.source AND f.source <> 'jooble.ch'
            AND s.created_at::date = CURRENT_DATE
            AND f.d_title <> s.d_title)
), batch_duplicates AS (
  -- Le mieux noté du lot reste, à score égal le premier dans l'ordre d'arrivée.
  SELECT f.k
  FROM fresh f
  JOIN fresh o
    ON o.k <> f.k
   AND (
     ((o.d_company LIKE f.d_company || '%' OR f.d_company LIKE o.d_company || '%')
      AND similarity(f.d_title, o.d_title) >= 0.7)
     OR (f.d_title = o.d_title AND length(f.d_title) >= 20
         AND (f.d_company IS NULL OR o.d_company IS NULL
              OR f.d_company IN ('jobroom', 'jobup') OR o.d_company IN ('jobroom', 'jobup')))
   )
   AND NOT (f.source = o.source AND f.source <> 'jooble.ch' AND f.d_title <> o.d_title)
   AND (o.score, f.k) > (f.score, o.k)
), still_listed AS (
  -- L'offre en base est toujours publiée ailleurs : sans ce rafraîchissement
  -- elle expirerait (TTL sur last_checked_at) et son doublon serait renvoyé.
  UPDATE job_listings SET last_checked_at = now()
  WHERE id IN (SELECT id FROM stored_duplicates)
  RETURNING id
)
SELECT i.k,
       i.k IN (SELECT k FROM known) AS known,
       (i.k IN (SELECT k FROM stored_duplicates) OR i.k IN (SELECT k FROM batch_duplicates)) AS duplicate
FROM incoming i
ORDER BY i.k;
