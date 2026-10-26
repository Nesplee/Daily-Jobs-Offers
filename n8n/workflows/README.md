# Workflows n8n — source de déploiement

`daily_jobs_offers.json`, `weekly_recap.json` et `enrich_descriptions.json` sont exportés depuis l'instance n8n du VPS (`n8n export:workflow`) et versionnés ici comme **source de vérité déployable**, pas comme simple trace. Après un `git pull` sur le VPS, `scripts/deploy_workflows.sh` les réimporte dans n8n via sa CLI (`n8n import:workflow`), qui met à jour chaque workflow existant en place (matché par son `id` JSON top-level) plutôt que d'en créer un doublon, puis réactive et redémarre n8n (l'import désactive toujours ce qu'il importe).

**Ce que ces fichiers contiennent (et ne contiennent pas) :**

- Aucune clé API en clair, et aucune adresse email personnelle en dur. `Adzuna Search`, `Jooble Search`, `Traduction Deepl` lisent leurs secrets via des expressions `{{ $env.VAR }}`, résolues depuis les variables d'environnement du conteneur n8n (déclarées dans `docker-compose.yml`, valeurs dans `.env`, jamais commité). Les deux nodes `Send Email` (digest quotidien et récap hebdomadaire) lisent de la même façon `fromEmail`/`toEmail` via `{{ $env.DIGEST_EMAIL }}`. Rien à resaisir dans n8n après import — seul `.env` doit être à jour sur la machine cible.
- Les `id` de credentials n8n (`Postgres`/`SMTP`) référencés dans les nodes (`Postgres`, `Absorption`, `Nettoyage`, `SELECT offers`, `Send Email`, `Mark as notified`) correspondent aux credentials **déjà créées sur l'instance n8n du VPS** — ce n'est pas portable tel quel vers une instance n8n vierge : il faudrait y recréer des credentials avec ces mêmes `id`, ou réassigner les nodes manuellement après import.
- La table `search_profiles` doit être peuplée manuellement après les migrations (le schéma est créé par les migrations, pas les données) — sinon le workflow ne fait rien silencieusement.

## Enrich Descriptions (`enrich_descriptions.json`)

Les recherches de toutes les sources ne renvoient qu'un extrait de description (ou rien pour
LinkedIn, CERN et swissdevjobs). Ce workflow, lancé à 8h30 les jours ouvrés après la collecte, lit la page de
détail de chaque annonce et range le texte complet, dans sa langue d'origine (pas de DeepL),
dans `raw_extra.description_full`. C'est la clé que `second_brain` lit en priorité.

- Extraction par source dans [`n8n/logic/extract_description.js`](../logic/extract_description.js) :
  point d'accès invité LinkedIn, API de détail Job-Room, API SmartRecruiters (CERN), JSON-LD
  `JobPosting` (jobs.ch, jobup.ch, SRG SSR, Nestlé), objet `window.__detailedJob` embarqué dans la
  page (swissdevjobs). Une requête toutes les 5 s (LinkedIn répond 429 en dessous).
- Jooble et Adzuna répondent 403 hors navigateur : leurs annonces reprennent la description d'un
  doublon d'une autre source (mêmes règles que le digest), voir
  [`n8n/sql/borrow_duplicate_descriptions.sql`](../sql/borrow_duplicate_descriptions.sql). Indeed
  donne déjà le texte complet.
- Trois essais au plus par annonce ; la raison du dernier échec reste dans
  `raw_extra.description_fetch_error`. Un e-mail d'alerte part si une source ne donne aucune
  description sur au moins 3 essais dans un même passage.
- L'upsert du workflow quotidien n'efface plus `description_full` quand la recherche renvoie null.

