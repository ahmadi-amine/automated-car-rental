# Contributing

Quick guide to running LuxDrive locally. For deployment see [`DEPLOYMENT.md`](./DEPLOYMENT.md);
for feature overview see [`README.md`](./README.md).

## Prerequisites
- **Node.js 22+** (see `.nvmrc` — `nvm use`)
- A PostgreSQL database with the `pgvector` extension (managed **Neon** is easiest)

## Setup

```bash
# 1. Backend
cd backend
cp .env.example .env         # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, etc.
npm ci
npx prisma generate
npx prisma migrate deploy    # apply migrations
npm run start:dev            # http://localhost:3001/api

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL (defaults to http://localhost:3001)
npm ci
npm run dev                  # http://localhost:3000
```

## Environment
- Secrets live in `backend/.env` and `frontend/.env.local` — both are gitignored; never commit them.
- `DATABASE_URL` must point at your Postgres/Neon instance (`...neon.tech/...?sslmode=require`).
- Email is optional: leave `GMAIL_APP_PASSWORD` empty to disable outgoing mail in development.

## Database changes
- Edit `backend/prisma/schema.prisma`, then add a migration under `backend/prisma/migrations/`
  and apply it with `npx prisma migrate deploy`. Run `npx prisma generate` after schema changes.

## Conventions
- Keep commits small and focused; build must pass before committing
  (`npm run build` in the changed package).
- Match the style of surrounding code; `.editorconfig` covers basic formatting.
