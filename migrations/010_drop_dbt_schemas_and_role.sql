-- dbt a été retiré du VPS le 2026-11-15 (commit 5feb466) : ses schémas et son
-- rôle (migration 007) ne servent plus.
--   - analytics et dbt_dev : modèles dbt, reconstructibles (code supprimé, mais
--     sans données propres) ;
--   - snapshots : historique de job_listings du 2026-10-26 (756 lignes),
--     archivé avant le DROP dans archive/snapshots-schema-2026-11-24.dump
--     (pg_dump -Fc -n snapshots) ;
--   - rôle dbt_runner : ne possède que des objets de ces trois schémas.
-- Sans effet si le rôle et les schémas n'existent plus (installation propre).
DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA IF EXISTS dbt_dev CASCADE;
DROP SCHEMA IF EXISTS snapshots CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dbt_runner') THEN
        REASSIGN OWNED BY dbt_runner TO CURRENT_USER;
        DROP OWNED BY dbt_runner;
        DROP ROLE dbt_runner;
    END IF;
END
$$;
