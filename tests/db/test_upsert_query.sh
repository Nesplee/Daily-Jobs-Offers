#!/usr/bin/env bash
set -euo pipefail
source .env
PSQL_EXEC="docker compose exec -T db psql -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -v ON_ERROR_STOP=1"

$PSQL_EXEC -c "DELETE FROM job_listings WHERE source = 'test-upsert';"

# Runs the ACTUAL n8n/sql/upsert_job_listing.sql file (piped over stdin, see
# the comment in tests/db/test_ttl_query.sh for why -f can't be used here),
# with psql's own -v NAME=value substitution feeding the file's :name
# placeholders — the same placeholder syntax n8n's Postgres node uses.
run_upsert() {
  local raw_extra=$1
  $PSQL_EXEC \
    -v source="'test-upsert'" -v source_id="'abc'" -v title="'Title'" -v company="'Acme'" \
    -v url="'https://example.com/abc'" -v location="'Lausanne'" \
    -v keywords_matched="ARRAY['python']" -v search_profile_id="NULL" -v posted_at="'2026-08-01'" \
    -v raw_extra="'${raw_extra}'::jsonb" \
    < n8n/sql/upsert_job_listing.sql
}

run_upsert '{"contract_type":"CDI"}' > /tmp/upsert_1.out
run_upsert '{"contract_type":"CDD"}' > /tmp/upsert_2.out

count=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT count(*) FROM job_listings WHERE source = 'test-upsert';")
extra=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT raw_extra->>'contract_type' FROM job_listings WHERE source = 'test-upsert';")

if [ "$count" = "1" ] && [ "$extra" = "CDD" ]; then
  echo "PASS: second upsert updated the existing row (no duplicate, raw_extra refreshed)"
else
  echo "FAIL: expected 1 row with raw_extra CDD, got count=${count} extra=${extra}"
  exit 1
fi

$PSQL_EXEC -c "DELETE FROM job_listings WHERE source = 'test-upsert';"
