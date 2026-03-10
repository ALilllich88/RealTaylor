#!/bin/sh
# RealTaylor production startup script
# Runs in the Railway/Docker container before starting the Node server.
# Using explicit logging so each step is visible in Railway's deploy log.
set -e

echo "[startup] === RealTaylor container starting ==="
echo "[startup] NODE_ENV=${NODE_ENV:-<not set>}"
echo "[startup] PORT=${PORT:-<not set>}"

echo "[startup] Running: npx --yes prisma db push --skip-generate"
npx --yes prisma db push --skip-generate
echo "[startup] prisma db push finished OK"

echo "[startup] Handing off to: node server/dist/index.js"
exec node server/dist/index.js
