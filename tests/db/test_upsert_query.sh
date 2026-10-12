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
    -v match_score="4" -v match_category="'secondary'" \
    -v location_incomplete="false" -v foreign_language="NULL" \
    < n8n/sql/upsert_job_listing.sql
}

# The first pass stores a translated listing; the second is the same listing
# seen again the next day, which is no longer sent to translation.
run_upsert '{"contract_type":"CDI","title_original":"Data Engineer"}' > /tmp/upsert_1.out
run_upsert '{"contract_type":"CDD"}' > /tmp/upsert_2.out

count=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT count(*) FROM job_listings WHERE source = 'test-upsert';")
extra=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT raw_extra->>'contract_type' FROM job_listings WHERE source = 'test-upsert';")

original=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT raw_extra->>'title_original' FROM job_listings WHERE source = 'test-upsert';")

if [ "$count" = "1" ] && [ "$extra" = "CDD" ] && [ "$original" = "Data Engineer" ]; then
  echo "PASS: second upsert updated the existing row (no duplicate, raw_extra refreshed, translation kept)"
else
  echo "FAIL: expected 1 row with raw_extra CDD and title_original kept, got count=${count} extra=${extra} original=${original}"
  exit 1
fi

$PSQL_EXEC -c "DELETE FROM job_listings WHERE source = 'test-upsert';"
