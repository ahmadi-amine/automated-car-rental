#!/bin/sh
# Backend container entrypoint: apply pending database migrations, then start the API.
# `prisma migrate deploy` is idempotent and safe to run on every boot.
set -e

echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Starting NestJS server..."
exec node dist/src/main
