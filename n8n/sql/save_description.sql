-- Résultat de la récupération d'une description. Paramètres, dans l'ordre :
-- texte (ou NULL), erreur (ou NULL), id de l'annonce. Pas de "dollar-numéro"
-- dans ce commentaire : n8n substitue les paramètres partout dans la requête,
-- commentaires compris. Succès : description_full et sa provenance. Échec :
-- un essai de plus et la raison, visible dans la base pour diagnostiquer une
-- source dont la page a changé.
UPDATE job_listings
SET raw_extra = CASE
  WHEN $1::text IS NOT NULL THEN
    (raw_extra - 'description_fetch_error') || jsonb_build_object(
      'description_full', $1::text,
      'description_source', 'detail_page',
      'description_fetched_at', now())
  ELSE
    raw_extra || jsonb_build_object(
      'description_fetch_attempts', coalesce((raw_extra->>'description_fetch_attempts')::int, 0) + 1,
      'description_fetch_error', $2::text,
      'description_fetched_at', now())
  END
WHERE id = $3::uuid;
