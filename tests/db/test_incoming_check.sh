#!/usr/bin/env bash
set -euo pipefail
source .env
# Same stdin trick as tests/db/test_ttl_query.sh: n8n/sql/ is not mounted in
# the "db" container, so the host .sql file is piped instead of passed to -f.
PSQL_EXEC="docker compose exec -T db psql -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -v ON_ERROR_STOP=1"

cleanup() { $PSQL_EXEC -c "DELETE FROM job_listings WHERE source LIKE 'test-incoming-%';" > /dev/null; }
cleanup

# Fictitious employers and titles so the query, which reads the whole table,
# cannot match real rows (a relayed offer matches on its title alone). Stored titles are translated; the original is kept in
# raw_extra.title_original, and that is what an incoming title is compared to.
$PSQL_EXEC -c "
INSERT INTO job_listings (source, source_id, title, company, url, raw_extra, created_at, last_checked_at) VALUES
  ('test-incoming-a', 'stored-1', 'Ingénieur de données cloud et streaming', 'Zorblax Odier', 'https://example.com/1',
   '{\"title_original\": \"Cloud and Streaming Data Engineer\"}', now() - interval '3 days', now() - interval '3 days'),
  ('test-incoming-a', 'stored-2', 'Ingénieur logiciel backend (hébergement)', 'Wobblecloud', 'https://example.com/2',
   '{}', now() - interval '3 days', now() - interval '3 days');
" > /dev/null

incoming='[
  {"k": 0, "source": "test-incoming-a", "source_id": "stored-1", "title": "Cloud and Streaming Data Engineer", "company": "Zorblax Odier", "score": 5},
  {"k": 1, "source": "test-incoming-b", "source_id": "recrawl", "title": "Cloud & Streaming Data Engineer (80-100%)", "company": "Banque Zorblax Odier & Cie SA", "score": 5},
  {"k": 2, "source": "test-incoming-b", "source_id": "relay", "title": "Ingénieur logiciel backend (hébergement)", "company": "Job-Room", "score": 4},
  {"k": 3, "source": "test-incoming-b", "source_id": "batch-lo", "title": "Ingénieur en intégration et DevOps (80 à 100 %)", "company": "Quuxbank", "score": 3},
  {"k": 4, "source": "test-incoming-c", "source_id": "batch-hi", "title": "Ingénieur en intégration et DevOps - Genève", "company": "Quuxbank SA", "score": 7},
  {"k": 5, "source": "test-incoming-b", "source_id": "role-1", "title": "Ingénieur DevOps", "company": "Flimflam SA", "score": 4},
  {"k": 6, "source": "test-incoming-b", "source_id": "role-2", "title": "Ingénieur DevOps IAM", "company": "Flimflam SA", "score": 4},
  {"k": 7, "source": "test-incoming-b", "source_id": "other", "title": "Zorblax Telemetry Platform Engineer", "company": "Zorblax Odier", "score": 4}
]'

# k|known|duplicate : 0 is already stored (same source and id); 1 and 2 are
# the stored offers back under a new id; 3 loses to 4, the better scored copy
# of the same offer in this batch; 5 and 6 are two distinct openings published
# by one source; 7 is a different role at a stored employer.
verdicts=$($PSQL_EXEC -tA -v incoming="'${incoming//\'/\'\'}'" < n8n/sql/check_incoming_listings.sql | grep -E '^[0-9]+\|' | tr '\n' ' ')
expected="0|t|f 1|f|t 2|f|t 3|f|t 4|f|f 5|f|f 6|f|f 7|f|f "

# A stored offer still relayed by another source must not expire from the
# table (TTL on last_checked_at), or its duplicate would be sent again.
refreshed=$($PSQL_EXEC -tAc "SELECT count(*) FROM job_listings WHERE source = 'test-incoming-a' AND last_checked_at > now() - interval '1 minute';")

if [ "$verdicts" = "$expected" ] && [ "$refreshed" = "2" ]; then
  echo "PASS: incoming listings are flagged as known or duplicate before translation"
  result=0
else
  echo "FAIL: expected [${expected}] and 2 refreshed rows, got [${verdicts}] and ${refreshed}"
  result=1
fi

cleanup
exit $result
