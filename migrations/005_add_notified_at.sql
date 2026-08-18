-- Le digest quotidien filtrait sur created_at::date = CURRENT_DATE, donc une
-- offre insérée un jour où l'envoi de l'email échouait (ex. panne source en
-- amont) n'était plus jamais reprise le lendemain, alors qu'elle n'avait
-- jamais été envoyée. notified_at suit ce qui a réellement été envoyé,
-- indépendamment du jour de création de la ligne.
ALTER TABLE job_listings ADD COLUMN notified_at TIMESTAMPTZ;
