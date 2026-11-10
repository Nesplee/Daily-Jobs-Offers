#!/usr/bin/env bash
# Renouvelle le certificat Tailscale du VPS. Aucun nom de machine ni chemin en dur :
# le nom MagicDNS est lu auprès de tailscale, le dossier est déduit de l'emplacement du script.
# Programmé via `sudo crontab -e` : 0 4 * * 1 (chaque lundi 4h). Nécessite
# root (tailscale cert). Le cert Tailscale expire tous les ~90 jours ;
# `tailscale cert` est un no-op si le cert en cours est encore valide.
set -euo pipefail

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
CERT_DIR="$REPO_DIR/tailscale-certs"
DOMAIN=$(tailscale status --json | python3 -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
[ -n "$DOMAIN" ] || { echo "$(date): nom MagicDNS introuvable" >&2; exit 1; }

OLD_HASH=$(sha256sum "$CERT_DIR/cert.pem" | awk '{print $1}')

tailscale cert --cert-file="$CERT_DIR/cert.pem" --key-file="$CERT_DIR/key.pem" "$DOMAIN"
chown --reference="$CERT_DIR" "$CERT_DIR"/*.pem

NEW_HASH=$(sha256sum "$CERT_DIR/cert.pem" | awk '{print $1}')

if [ "$OLD_HASH" != "$NEW_HASH" ]; then
  echo "$(date): certificat renouvelé, redémarrage n8n"
  cd "$REPO_DIR" && docker compose restart n8n
fi
