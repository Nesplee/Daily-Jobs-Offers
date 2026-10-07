-- Offres à envoyer dans le digest. Une offre est écartée si la même offre
-- (même employeur normalisé, intitulé similaire) a déjà été envoyée, quelle
-- que soit la source, ou si un doublon mieux noté est envoyé le même jour.
-- Les fonctions dedup_* viennent de migrations/006_add_cross_source_dedup.sql.
--
-- Employeur : égalité par préfixe, pour que "lombardodier" couvre aussi
-- "lombardodierinvestmentmanagers" et "sonar" couvre "sonarsource".
-- Intitulé : similarité trigramme >= 0.7, calibrée sur les données réelles —
-- les variantes d'une même offre ressortent entre 0.71 et 1.0, deux stages
-- distincts du même employeur à 0.34.
WITH candidates AS (
  SELECT j.*, dedup_company(j.company) AS d_company, dedup_title(j.title) AS d_title
  FROM job_listings j
), same_offer AS (
  SELECT a.id AS id, b.id AS other_id, b.notified_at AS other_notified_at,
         b.match_score AS other_score, b.created_at AS other_created_at
  FROM candidates a
  JOIN candidates b
    ON b.id <> a.id
   AND (
     ((b.d_company LIKE a.d_company || '%' OR a.d_company LIKE b.d_company || '%')
      AND similarity(a.d_title, b.d_title) >= 0.7)
     -- Employeur inconnu (Jooble sans entreprise) ou remplacé par le portail
     -- (Adzuna met "Job-Room", Job-Room met "Jobup") : seul un intitulé
     -- identique et assez spécifique compte, pas "Software Engineer" seul.
     OR (a.d_title = b.d_title AND length(a.d_title) >= 20
         AND (a.d_company IS NULL OR b.d_company IS NULL
              OR a.d_company IN ('jobroom', 'jobup') OR b.d_company IN ('jobroom', 'jobup')))
   )
   -- Une source qui publie le même jour deux annonces aux intitulés proches
   -- mais différents publie deux postes distincts (ex. Pictet "Ingénieur
   -- DevOps" et "Ingénieur DevOps IAM" sur jobs.ch). Un intitulé identique
   -- reste un doublon (Job-Room liste la même offre Swissquote 4 fois).
   -- Jooble est exclu : il agrège plusieurs flux et reformule les titres.
   AND NOT (a.source = b.source AND a.source <> 'jooble.ch'
            AND a.created_at::date = b.created_at::date
            AND a.d_title <> b.d_title)
  WHERE a.notified_at IS NULL
)
SELECT c.id, c.source, c.source_id, c.title, c.company, c.url, c.location,
       c.keywords_matched, c.search_profile_id, c.posted_at, c.created_at,
       c.last_checked_at, c.is_read, c.is_favorite, c.notes, c.raw_extra,
       c.match_score, c.match_category, c.location_incomplete,
       c.foreign_language, c.notified_at
FROM candidates c
WHERE c.notified_at IS NULL
  AND NOT EXISTS (
    -- Doublon déjà envoyé, ou doublon du même lot qui passe devant
    -- (meilleur score, puis plus ancien, puis id le plus petit).
    SELECT 1 FROM same_offer s
    WHERE s.id = c.id
      AND (
        s.other_notified_at IS NOT NULL
        OR (coalesce(s.other_score, 0), c.created_at, c.id::text)
         > (coalesce(c.match_score, 0), s.other_created_at, s.other_id::text)
      )
  )
ORDER BY c.match_category, c.match_score DESC;
