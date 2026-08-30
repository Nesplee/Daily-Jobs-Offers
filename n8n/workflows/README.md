# Workflows n8n — source de déploiement

`daily_jobs_offers.json` et `weekly_recap.json` sont exportés depuis l'instance n8n du VPS (`n8n export:workflow`) et versionnés ici comme **source de vérité déployable**, pas comme simple trace. Après un `git pull` sur le VPS, `scripts/deploy_workflows.sh` les réimporte dans n8n via sa CLI (`n8n import:workflow`), qui met à jour chaque workflow existant en place (matché par son `id` JSON top-level) plutôt que d'en créer un doublon, puis réactive et redémarre n8n (l'import désactive toujours ce qu'il importe).

**Ce que ces fichiers contiennent (et ne contiennent pas) :**

- Aucune clé API en clair, et aucune adresse email personnelle en dur. `Adzuna Search`, `Jooble Search`, `Traduction Deepl` lisent leurs secrets via des expressions `{{ $env.VAR }}`, résolues depuis les variables d'environnement du conteneur n8n (déclarées dans `docker-compose.yml`, valeurs dans `.env`, jamais commité). Les deux nodes `Send Email` (digest quotidien et récap hebdomadaire) lisent de la même façon `fromEmail`/`toEmail` via `{{ $env.DIGEST_EMAIL }}`. Rien à resaisir dans n8n après import — seul `.env` doit être à jour sur la machine cible.
- Les `id` de credentials n8n (`Postgres`/`SMTP`) référencés dans les nodes (`Postgres`, `Absorption`, `Nettoyage`, `SELECT offers`, `Send Email`, `Mark as notified`) correspondent aux credentials **déjà créées sur l'instance n8n du VPS** — ce n'est pas portable tel quel vers une instance n8n vierge : il faudrait y recréer des credentials avec ces mêmes `id`, ou réassigner les nodes manuellement après import.
- La table `search_profiles` doit être peuplée manuellement après les migrations (le schéma est créé par les migrations, pas les données) — sinon le workflow ne fait rien silencieusement.
