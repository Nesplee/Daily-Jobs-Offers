# Export du workflow n8n

`daily_jobs_offers.json` est un export du workflow "Daily Jobs Offers" — utile comme trace versionnée de la structure du pipeline (nodes, connexions, logique de scoring/traduction/digest), pas comme source de déploiement automatique.

**Avant réimport dans une instance n8n :**

- Les clés API sont **volontairement redacted** (`REDACTED_ADZUNA_APP_ID`, `REDACTED_ADZUNA_APP_KEY`, `REDACTED_JOOBLE_API_KEY`, `REDACTED_DEEPL_API_KEY`) dans les nodes `Adzuna Search`, `Jooble Search`, `Traduction Deepl` — à resaisir manuellement après import.
- Les 2 credentials n8n référencés (`annonces db` Postgres, `SMTP account`) ne sont jamais inclus dans un export — n8n ne transfère jamais les identifiants en clair entre instances. À recréer manuellement et à réassigner sur les 5 nodes concernés (`Postgres`, `Absorption`, `Nettoyage`, `SELECT offers`, `Send Email`).
- La table `search_profiles` doit être peuplée manuellement après les migrations (le schéma est créé par les migrations, pas les données) — sinon le workflow ne fait rien silencieusement.

Voir `docs/superpowers/specs/2026-08-12-job-scraper-design.md` §6 pour le détail complet du déploiement (Proton Mail Bridge, réseau Docker partagé avec Metabase, etc.).
