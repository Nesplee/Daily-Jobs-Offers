# dbt — historique et analyse du marché

Couche analytique construite par-dessus `public.job_listings`, sans jamais y écrire. Rôle
Postgres `dbt_runner` (migration 007) : lecture sur `public`, écriture dans `dbt_dev` (cible
`dev`, par défaut), `analytics` (cible `prod`) et `snapshots`. Metabase (`metabase_app`)
lit `analytics` et `snapshots`.

```text
job_listings ──snapshot──> snapshots.job_listings_snapshot   (historique, survit au nettoyage n8n)
                                │
seeds skills, canton_aliases ──>├─ stg_job_listings      une ligne par annonce + canton + offer_key
                                ├─ int_offers            une ligne par offre réelle (multi-sources)
                                ├─ int_offer_skills      compétences citées par offre
                                └─ marts : skill_demand, skill_demand_weekly,
                                           listings_by_source_weekly, top_hiring_companies,
                                           description_coverage
```

## Pourquoi un snapshot

Le workflow n8n supprime les offres non lues qui n'ont plus été vues depuis 20 jours
(`n8n/sql/ttl_cleanup.sql`). Le snapshot les conserve (`dbt_is_deleted`) et garde chaque
changement des colonnes suivies (SCD type 2). Il ne voit que ce qui existe au moment où il
tourne : la tâche cron doit donc passer chaque jour ouvré.

## Lancer

```bash
python3 -m venv .venv-dbt && .venv-dbt/bin/pip install "dbt-core==1.12.6" "dbt-postgres==1.11.0"
./scripts/dbt.sh deps
./scripts/dbt.sh build                     # seeds + snapshot + modèles + tests, dans dbt_dev
./scripts/dbt.sh build --select +skill_demand
./scripts/dbt.sh source freshness
./scripts/dbt_daily.sh                     # ce que lance le cron (9h UTC, lundi-vendredi)
```

Le snapshot écrit toujours dans `snapshots`, quelle que soit la cible (macro
`generate_schema_name`). Logs du cron : `logs/dbt.log`.

## Limites connues

- Les compétences sont cherchées dans la description complète quand le workflow
  Enrich Descriptions a pu la lire, sinon dans l'extrait de la recherche : environ 43 % des
  offres ne citent encore aucune compétence du seed (surtout Jooble et Adzuna, dont les pages
  sont inaccessibles). Les parts de `skill_demand` sont des minimums ; `description_coverage`
  montre la couverture par source.
- Certaines « entreprises » sont des plateformes (jobup, Job-Room) quand la source ne
  donne pas l'employeur réel.
