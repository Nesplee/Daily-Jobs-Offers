-- Une ligne par source et par collecte quotidienne : offres brutes reçues,
-- offres retenues par "Filter by profile" et requêtes en échec. n8n ne garde
-- que ~10 exécutions et job_listings ne contient que les offres retenues, donc
-- le brut n'existait nulle part : une source tombée à 0 n'était pas détectable
-- (indeed.ch a répondu 401 le 13.11.2026 sans que rien ne le montre).
-- Lu par le récap hebdomadaire et par le contrôle quotidien de ~/bin/check-jobs.sh.
CREATE TABLE source_run_stats (
    run_date     DATE NOT NULL,
    source       VARCHAR NOT NULL,
    raw_count    INTEGER NOT NULL,
    kept_count   INTEGER NOT NULL,
    error_count  INTEGER NOT NULL DEFAULT 0,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_date, source)
);

GRANT SELECT, INSERT, UPDATE ON source_run_stats TO n8n_app;
