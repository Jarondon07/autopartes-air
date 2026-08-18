#!/usr/bin/env bash
#
# Despliegue/actualización de AutoparteAIR en el VPS.
# Uso (como root):  bash /srv/autopartes-air/deploy/deploy.sh
#
# `git pull` respeta el sparse-checkout, así que apps/desktop sigue sin bajarse.
set -euo pipefail

APP_DIR=/srv/autopartes-air
APP_USER=autopartes

cd "$APP_DIR"

echo "→ Trayendo cambios de git…"
git pull --ff-only

echo "→ Instalando dependencias (incluye devDeps: tsx y vite son necesarios)…"
npm ci

echo "→ Aplicando migraciones…"
npm run db:migrate:prod -w @autopartes-air/server

echo "→ Compilando la web…"
npm run build -w @autopartes-air/web

echo "→ Ajustando permisos…"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/apps/server/uploads"

echo "→ Reiniciando servicios…"
systemctl restart autopartes-api
systemctl reload nginx

echo "→ Verificando salud de la API…"
sleep 3
curl -fsS http://127.0.0.1:4300/api/v1/health && echo

echo "✅ Despliegue completado"
