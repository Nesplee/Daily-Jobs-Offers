#!/usr/bin/env bash
# Spécifique au déploiement VPS actuel (chemin et nom MagicDNS en dur).
# Programmé via `sudo crontab -e` : 0 4 * * 1 (chaque lundi 4h). Nécessite
# root (tailscale cert). Le cert Tailscale expire tous les ~90 jours ;
# `tailscale cert` est un no-op si le cert en cours est encore valide.
set -euo pipefail

CERT_DIR=/home/ubuntu/annonces/tailscale-certs
DOMAIN=annonces-vps.tail094416.ts.net

OLD_HASH=$(sha256sum "$CERT_DIR/cert.pem" | awk '{print $1}')

tailscale cert --cert-file="$CERT_DIR/cert.pem" --key-file="$CERT_DIR/key.pem" "$DOMAIN"
chown ubuntu:ubuntu "$CERT_DIR"/*.pem

NEW_HASH=$(sha256sum "$CERT_DIR/cert.pem" | awk '{print $1}')

if [ "$OLD_HASH" != "$NEW_HASH" ]; then
  echo "$(date): certificat renouvelé, redémarrage n8n"
  cd /home/ubuntu/annonces && docker compose restart n8n
fi
