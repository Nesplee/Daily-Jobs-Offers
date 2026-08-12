#!/usr/bin/env bash
set -euo pipefail

source .env

ADMIN_PSQL="docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB}"

$ADMIN_PSQL -c "CREATE TABLE IF NOT EXISTS public.schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"

for filepath in migrations/*.sql; do
    filename=$(basename "$filepath")
    already_applied=$($ADMIN_PSQL -tAc "SELECT 1 FROM public.schema_migrations WHERE filename = '${filename}';")
    if [ "$already_applied" = "1" ]; then
        echo "Skip (déjà appliquée) : ${filename}"
        continue
    fi
    echo "Applique : ${filename}"
    $ADMIN_PSQL -f "/migrations/${filename}"
    $ADMIN_PSQL -c "INSERT INTO public.schema_migrations (filename) VALUES ('${filename}');"
done

# Synchronise les mots de passe des rôles applicatifs avec .env (créés sans
# mot de passe dans les migrations SQL, jamais commitées avec un secret).
if $ADMIN_PSQL -tAc "SELECT 1 FROM pg_roles WHERE rolname='n8n_app';" | grep -q 1; then
  $ADMIN_PSQL -c "ALTER ROLE n8n_app WITH PASSWORD '${N8N_APP_PASSWORD}';"
fi
if $ADMIN_PSQL -tAc "SELECT 1 FROM pg_roles WHERE rolname='metabase_app';" | grep -q 1; then
  $ADMIN_PSQL -c "ALTER ROLE metabase_app WITH PASSWORD '${METABASE_APP_PASSWORD}';"
fi
