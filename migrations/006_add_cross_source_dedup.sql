-- UNIQUE (source, source_id) ne dédoublonne qu'à l'intérieur d'une source et
-- seulement si la source garde un identifiant stable. En pratique la même
-- offre arrive par plusieurs sources (jooble, adzuna, jobs.ch, jobup.ch,
-- swissdevjobs, linkedin) et Jooble lui attribue un nouvel identifiant à
-- chaque crawl : la même annonce était donc renvoyée tous les jours.
-- Ces deux fonctions donnent une identité métier (employeur + intitulé)
-- utilisée par la requête du digest (n8n/sql/select_digest_offers.sql).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- "Banque Lombard Odier & Cie SA", "Bank Lombard Odier & Co" et
-- "lombardodier" donnent tous "lombardodier". NULL si rien ne reste, pour
-- qu'une offre sans employeur ne soit jamais considérée comme un doublon.
CREATE FUNCTION dedup_company(company TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(regexp_replace(regexp_replace(
    lower(unaccent(coalesce(company, ''))),
    '\m(sa|ag|sarl|gmbh|ltd|inc|cie|co|bank|banque|group|groupe|switzerland|suisse|schweiz)\M', '', 'g'),
    '[^a-z0-9]', '', 'g'), '')
$$;

-- Retire ponctuation, chiffres (taux d'activité "80 à 100 %"), mentions
-- de genre, mots vides et villes, que chaque source formule différemment :
-- "Stage – Ingénieur de données – …" et "Stagiaire ingénieur de données - …"
-- deviennent comparables par similarité trigramme.
CREATE FUNCTION dedup_title(title TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT trim(regexp_replace(regexp_replace(regexp_replace(
    lower(unaccent(coalesce(title, ''))),
    '[^a-z]+', ' ', 'g'),
    '\m(stage|stagiaire|internship|intern|h|f|m|w|d|e|x|de|des|du|la|le|les|l|et|en|a|au|of|the|and|for|geneve|lausanne|neuchatel|fribourg|nyon)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;
