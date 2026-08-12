#!/usr/bin/env bash
set -euo pipefail
source .env
PSQL="docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -c"

docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -c \
  "DELETE FROM job_listings WHERE source = 'test-dedupe';" > /dev/null

$PSQL "INSERT INTO job_listings (source, source_id, title, url) VALUES ('test-dedupe', 'dup-1', 'First insert', 'https://example.com/1');"

# Second insert with the SAME (source, source_id), NOT using ON CONFLICT:
# must be rejected by the UNIQUE constraint.
set +o pipefail
if docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -c \
  "INSERT INTO job_listings (source, source_id, title, url) VALUES ('test-dedupe', 'dup-1', 'Second insert', 'https://example.com/2');" 2>&1 | grep -q "duplicate key value violates unique constraint"; then
  echo "PASS: duplicate (source, source_id) rejected by UNIQUE constraint"
  result=0
else
  echo "FAIL: duplicate (source, source_id) was NOT rejected"
  result=1
fi
set -o pipefail

if [ $result -eq 1 ]; then
  exit 1
fi

$PSQL "DELETE FROM job_listings WHERE source = 'test-dedupe';" > /dev/null
