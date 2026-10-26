#!/usr/bin/env bash
# Tâche cron des jours ouvrés, après le workflow n8n de 8h : fige l'état de
# job_listings (snapshot, avant que le nettoyage à 20 jours n'efface des
# offres) puis reconstruit et teste les modèles de prod.
set -uo pipefail

cd "$(dirname "$0")/.."
echo "=== $(date -Iseconds)"
./scripts/dbt.sh snapshot --target prod
./scripts/dbt.sh build --target prod --exclude resource_type:snapshot
