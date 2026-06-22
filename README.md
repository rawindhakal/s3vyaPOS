# s3vyaPOS

Multi-tenant **POS + double-entry accounting** SaaS for small shops and restaurants.
PWA-ready, camera barcode scanning, and a real double-entry ledger behind every sale.

## Stack
- **API:** NestJS + Prisma + PostgreSQL (JWT auth, multi-tenant by `shopId`)
- **Web:** Next.js (App Router) + Tailwind + Zustand + TanStack Query, PWA via next-pwa
- **Barcode:** `html5-qrcode` (camera scan) + `bwip-js` (Code128 generation)
- **Monorepo:** pnpm workspaces + Turborepo

## Monorepo layout
```
apps/api     NestJS API + Prisma schema/seed
apps/web     Next.js PWA
packages/types  shared enums + DTO contracts
deploy/      pm2 ecosystem, nginx vhost, server setup notes
```

## Quick start (local)
```bash
corepack enable pnpm
pnpm install
cp .env.example .env            # set DATABASE_URL to a local Postgres

pnpm --filter @s3vya/api db:migrate   # create tables
pnpm --filter @s3vya/api db:seed      # demo shop: admin@demo.shop / admin123

pnpm dev                        # api :5300, web :3300
```
Open http://localhost:3300 and sign in with the demo account.

## What works in M1
- Sign up (creates shop + admin + seeds Chart of Accounts) / login / JWT refresh
- Products CRUD with auto-SKU and optional barcode
- Camera barcode scan + Code128 barcode generation/printing
- POS terminal: scan/search → cart → checkout (Cash / Bank / QR) → receipt
- Every sale posts a balanced double-entry journal (Cash/Bank/QR + Sales + Tax + COGS/Inventory)
- Trial Balance / Balance Sheet / Ledger endpoints
- Per-shop business type (Retail / Restaurant / Both) and Nepal QR payments (Fonepay/eSewa, manual-confirm until merchant keys are added)

## Roadmap
- **M2:** purchases, vendors, customers, AP/AR
- **M3:** accounting dashboard UI (journal, trial balance, balance sheet, cash/bank books), bank accounts
- **M4:** restaurant tables/floor + dine-in orders + KOT, SaaS billing, live Fonepay/eSewa verification

## Deployment
See [`deploy/SERVER_SETUP.md`](deploy/SERVER_SETUP.md). Runs natively via pm2 + nginx + Let's Encrypt.
