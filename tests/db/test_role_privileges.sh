#!/usr/bin/env bash
set -euo pipefail
source .env

run_as() {
  local user=$1 password=$2 sql=$3
  PGPASSWORD="$password" docker compose exec -T -e PGPASSWORD="$password" db \
    psql -U "$user" -d "${POSTGRES_DB}" -c "$sql" 2>&1 || true
}

# metabase_app must NOT be able to delete from job_listings.
if run_as metabase_app "${METABASE_APP_PASSWORD}" "DELETE FROM job_listings WHERE source='no-such-row';" | grep -q "permission denied"; then
  echo "PASS: metabase_app cannot DELETE from job_listings"
else
  echo "FAIL: metabase_app was able to DELETE from job_listings"
  exit 1
fi

# metabase_app must NOT be able to insert into search_profiles.
if run_as metabase_app "${METABASE_APP_PASSWORD}" "INSERT INTO search_profiles (name, keywords, locations) VALUES ('x', ARRAY['x'], ARRAY['x']);" | grep -q "permission denied"; then
  echo "PASS: metabase_app cannot INSERT into search_profiles"
else
  echo "FAIL: metabase_app was able to INSERT into search_profiles"
  exit 1
fi

# n8n_app MUST be able to delete from job_listings (needed by the TTL cleanup step).
if run_as n8n_app "${N8N_APP_PASSWORD}" "DELETE FROM job_listings WHERE source='no-such-row';" | grep -qi "DELETE 0"; then
  echo "PASS: n8n_app can DELETE from job_listings"
else
  echo "FAIL: n8n_app could not DELETE from job_listings"
  exit 1
fi
