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

echo "Workflows deployed."
