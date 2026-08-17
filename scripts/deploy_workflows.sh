#!/usr/bin/env bash
# Push the versioned n8n workflow JSONs (n8n/workflows/*.json) into the
# running n8n container via its import CLI. n8n matches on each workflow's
# top-level "id" field and updates the existing workflow in place instead of
# creating a duplicate — run this after every `git pull` that touches
# n8n/workflows/.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose cp n8n/workflows "n8n:/tmp/deploy_workflows"
docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/deploy_workflows
docker compose exec -T n8n rm -rf /tmp/deploy_workflows

# n8n's import CLI always deactivates whatever it imports, regardless of the
# "active" field in the JSON ("Remember to activate later") — restore each
# workflow's active state from its own JSON (not a blanket --all, so a
# workflow deliberately set to active:false in the repo stays off), then
# restart so it takes effect (activation changes are queued in the DB but
# ignored by a still-running process until restart).
for f in n8n/workflows/*.json; do
  id=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('id',''))" "$f")
  active=$(python3 -c "import json,sys; print(str(json.load(open(sys.argv[1])).get('active', False)).lower())" "$f")
  [ -n "$id" ] && docker compose exec -T n8n n8n update:workflow --id="$id" --active="$active"
done
docker compose restart n8n

echo "Workflows deployed and reactivated."
