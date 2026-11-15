-- Metabase a été supprimé du VPS le 2026-11-15 : son rôle metabase_app
-- (migrations 003 et 007) ne sert plus. Les offres sont désormais lues par
-- second_brain avec son propre rôle brain_reader.
-- Droits retirés :
--   - SELECT sur search_profiles, SELECT et UPDATE sur job_listings (003) ;
--   - USAGE sur les schémas analytics et snapshots, SELECT sur les tables que
--     dbt_runner y a créées, et le privilège par défaut FOR ROLE dbt_runner
--     qui les lui accordait (007).
-- Le rôle ne possède aucun objet, mais REASSIGN OWNED le couvre au cas où.
-- DROP OWNED ne nettoie que la base courante : le rôle ne doit avoir de droits
-- dans aucune autre base du cluster pour que DROP ROLE réussisse.
-- Sans effet si le rôle n'existe pas (installation déjà nettoyée).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metabase_app') THEN
        ALTER DEFAULT PRIVILEGES FOR ROLE dbt_runner IN SCHEMA analytics, snapshots
            REVOKE SELECT ON TABLES FROM metabase_app;
        REASSIGN OWNED BY metabase_app TO CURRENT_USER;
        DROP OWNED BY metabase_app;
        DROP ROLE metabase_app;
    END IF;
END
$$;
