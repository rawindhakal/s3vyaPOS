#!/usr/bin/env bash
# s3vyaPOS deploy/update script. Run from the repo root on the server.
set -euo pipefail

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing dependencies"
corepack enable pnpm
pnpm install --frozen-lockfile

echo "==> Applying database migrations"
pnpm --filter @s3vya/api db:deploy
pnpm --filter @s3vya/api db:generate

echo "==> Building"
pnpm build

echo "==> Reloading pm2"
pm2 reload deploy/ecosystem.config.js --update-env || pm2 start deploy/ecosystem.config.js
pm2 save

echo "==> Done."
