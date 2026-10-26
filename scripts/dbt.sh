#!/usr/bin/env bash
# Lance dbt contre la base annonces (port publié sur 127.0.0.1). Le mot de
# passe vient de .env, jamais affiché.
# Usage : ./scripts/dbt.sh build              (cible dev, schéma dbt_dev)
#         ./scripts/dbt.sh build --target prod
set -euo pipefail

cd "$(dirname "$0")/.."
source .env
: "${DBT_RUNNER_PASSWORD:?DBT_RUNNER_PASSWORD manquant dans .env}"

export DBT_RUNNER_PASSWORD
export DBT_DBNAME="${POSTGRES_DB}"
export DBT_HOST="${DBT_HOST:-127.0.0.1}"
export DBT_PORT="${DBT_PORT:-${POSTGRES_PORT}}"

exec .venv-dbt/bin/dbt "$@" --project-dir dbt --profiles-dir dbt
