#!/usr/bin/env bash
set -euo pipefail
source .env
PSQL="docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -tAc"

assert_table_exists() {
  local schema=$1 table=$2
  local exists
  exists=$($PSQL "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='${table}');")
  if [ "$exists" != "t" ]; then
    echo "FAIL: table ${schema}.${table} does not exist"
    exit 1
  fi
  echo "PASS: table ${schema}.${table} exists"
}

assert_table_exists public search_profiles

assert_table_exists public job_listings

assert_column_exists() {
  local table=$1 column=$2
  local exists
  exists=$($PSQL "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${column}');")
  if [ "$exists" != "t" ]; then
    echo "FAIL: column ${table}.${column} does not exist"
    exit 1
  fi
  echo "PASS: column ${table}.${column} exists"
}

for col in is_read is_favorite raw_extra keywords_matched search_profile_id; do
  assert_column_exists job_listings "$col"
done
