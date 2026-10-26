-- Couche analytique dbt (dossier dbt/) : trois schémas et un rôle dédié, sans
-- toucher aux tables existantes.
--   analytics : modèles de prod, lus par Metabase
--   dbt_dev   : bac à sable des essais
--   snapshots : historique de job_listings (dbt snapshot). Le workflow n8n
--               supprime les offres non lues après 20 jours, le snapshot les
--               garde pour pouvoir analyser le marché dans la durée.
-- dbt_runner ne fait que LIRE public : une erreur dans un modèle ne peut pas
-- toucher aux données du workflow. Mot de passe fixé par
-- scripts/apply_migrations.sh depuis .env.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dbt_runner') THEN
        CREATE ROLE dbt_runner LOGIN;
    END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS dbt_dev;
CREATE SCHEMA IF NOT EXISTS snapshots;

GRANT USAGE ON SCHEMA public TO dbt_runner;
GRANT SELECT ON search_profiles, job_listings TO dbt_runner;
-- dedup_company / dedup_title (migration 006) servent aussi en staging.
GRANT EXECUTE ON FUNCTION dedup_company(TEXT), dedup_title(TEXT) TO dbt_runner;

GRANT USAGE, CREATE ON SCHEMA analytics, dbt_dev, snapshots TO dbt_runner;

-- Metabase lit les modèles de prod et l'historique. Les objets sont créés par
-- dbt_runner, d'où le FOR ROLE.
GRANT USAGE ON SCHEMA analytics, snapshots TO metabase_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dbt_runner IN SCHEMA analytics, snapshots
    GRANT SELECT ON TABLES TO metabase_app;
