CREATE ROLE n8n_app LOGIN;
GRANT SELECT ON search_profiles TO n8n_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_listings TO n8n_app;

CREATE ROLE metabase_app LOGIN;
GRANT SELECT ON search_profiles TO metabase_app;
GRANT SELECT, UPDATE ON job_listings TO metabase_app;
