#!/usr/bin/env bash
set -euo pipefail
source .env
# Same stdin trick as tests/db/test_ttl_query.sh: n8n/sql/ is not mounted in
# the "db" container, so the host .sql file is piped instead of passed to -f.
PSQL_EXEC="docker compose exec -T db psql -U ${POSTGRES_ADMIN_USER} -d ${POSTGRES_DB} -v ON_ERROR_STOP=1"

cleanup() { $PSQL_EXEC -c "DELETE FROM job_listings WHERE source LIKE 'test-digest-%';" > /dev/null; }
cleanup

# Fictitious employers so the digest query, which reads the whole table,
# cannot match real rows.
$PSQL_EXEC -c "
INSERT INTO job_listings (source, source_id, title, company, url, match_score, created_at, notified_at) VALUES
  -- Already sent yesterday by one source...
  ('test-digest-a', 'sent', 'Stage - Ingénieur données - Accélérer l''adoption de Fabric', 'Zorblax Odier', 'https://example.com/1', 5, now() - interval '1 day', now() - interval '1 day'),
  -- ...back today under a new id, from another source, with another spelling.
  ('test-digest-b', 'new-id',   'Stage – Ingénieur de données – Accélérer l''adoption de Fabric', 'Banque Zorblax Odier & Cie SA', 'https://example.com/2', 5, now(), NULL),
  -- Same offer twice in today's batch: only the best scored one goes out.
  ('test-digest-a', 'batch-lo', 'Ingénieur en intégration et DevOps (80 à 100 %)', 'Quuxbank', 'https://example.com/3', 3, now(), NULL),
  ('test-digest-b', 'batch-hi', 'Ingénieur en intégration et DevOps - Genève', 'Quuxbank SA', 'https://example.com/4', 7, now(), NULL),
  -- Two distinct openings published the same day by the same source.
  ('test-digest-c', 'role-1', 'Ingénieur DevOps', 'Flimflam SA', 'https://example.com/5', 4, now(), NULL),
  ('test-digest-c', 'role-2', 'Ingénieur DevOps IAM', 'Flimflam SA', 'https://example.com/6', 4, now(), NULL),
  -- A different internship at the already-notified employer.
  ('test-digest-a', 'other-internship', 'Stage - Ingénieur de données - Optimisation de la diffusion', 'Zorblax Odier', 'https://example.com/7', 5, now(), NULL);
"

selected=$($PSQL_EXEC -tA < n8n/sql/select_digest_offers.sql | cut -d'|' -f3 | grep -E '^(new-id|batch-lo|batch-hi|role-1|role-2|other-internship)$' | sort | tr '\n' ' ')

expected="batch-hi other-internship role-1 role-2 "
if [ "$selected" = "$expected" ]; then
  echo "PASS: digest skips already-sent and same-batch duplicates across sources, keeps distinct offers"
  result=0
else
  echo "FAIL: expected [${expected}], got [${selected}]"
  result=1
fi

cleanup
exit $result
