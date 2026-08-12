#!/usr/bin/env bash
set -euo pipefail
source .env
# PSQL_EXEC has no -c/-f attached: -c "..." is appended per call below, and
# "< file" is used to run a *host* .sql file (piped over stdin, since psql
# runs INSIDE the "db" container via `docker compose exec` and would look
# for a -f path on the CONTAINER's filesystem, where n8n/sql/ isn't mounted
# — only migrations/ is, per docker-compose.yml).
PSQL_EXEC="docker compose exec -T db psql -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -v ON_ERROR_STOP=1"

$PSQL_EXEC -c "DELETE FROM job_listings WHERE source = 'test-ttl';"

$PSQL_EXEC -c "
INSERT INTO job_listings (source, source_id, title, url, last_checked_at, is_read, is_favorite) VALUES
  ('test-ttl', 'old-unread-unfav', 'Old unread', 'https://example.com/a', now() - interval '21 days', false, false),
  ('test-ttl', 'old-read',         'Old read',   'https://example.com/b', now() - interval '21 days', true,  false),
  ('test-ttl', 'old-favorite',     'Old fav',    'https://example.com/c', now() - interval '21 days', false, true),
  ('test-ttl', 'recent-unread',    'Recent',     'https://example.com/d', now(),                        false, false);
"

$PSQL_EXEC < n8n/sql/ttl_cleanup.sql

remaining=$(docker compose exec -T db psql -U "${POSTGRES_ADMIN_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT source_id FROM job_listings WHERE source = 'test-ttl' ORDER BY source_id;")

expected=$'old-favorite\nold-read\nrecent-unread'
if [ "$remaining" = "$expected" ]; then
  echo "PASS: TTL cleanup deleted only the old, unread, non-favorite row"
else
  echo "FAIL: expected rows [${expected}], got [${remaining}]"
  exit 1
fi

$PSQL_EXEC -c "DELETE FROM job_listings WHERE source = 'test-ttl';"
