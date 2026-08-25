# Deployment Guide — LuxDrive

AI-powered multi-tenant car rental platform. Two services (NestJS API + Next.js web)
and a PostgreSQL database with the **pgvector** extension.

---

## 1. Prerequisites

- Docker + Docker Compose (or a container platform), **or** Node.js 20+ for a manual build.
- A PostgreSQL 16 database **with the `vector` (pgvector) extension available**.
  - Managed option (recommended): **Neon** — pgvector is supported out of the box.
  - Self-hosted option: use the `pgvector/pgvector:pg16` image (bundled in `docker-compose.yml`).
- An **OpenAI API key** (chatbot, Whisper STT, TTS, embeddings).

## 2. Environment variables

Copy the templates and fill in real values. **Never commit real secrets** —
`.env`, `.env.docker`, and `backend/.env` are gitignored.

### Root (`.env`, used by Docker Compose) — see `.env.example`
| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the bundled Postgres service |
| `JWT_SECRET` | Long random string for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `OPENAI_API_KEY` | OpenAI secret key |
| `NEXT_PUBLIC_API_URL` | **Public** backend origin the browser calls (baked into the web build) |

### Backend (`backend/.env`, manual/local runs) — see `backend/.env.example`
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `OPENAI_API_KEY`, `CORS_ORIGIN`.

**Email (booking confirmations, optional):** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM`.
Sends the client a confirmation when an agency confirms a booking, via Gmail SMTP.
`GMAIL_APP_PASSWORD` is a 16-char Google App Password (needs 2-Step Verification), not the
account password. Leave `GMAIL_APP_PASSWORD` empty to disable emailing. See the README's
"Email notifications" section for details.

> **Important — `NEXT_PUBLIC_API_URL` is baked at build time.** Next.js inlines
> `NEXT_PUBLIC_*` during `next build`, so it is passed as a Docker **build arg**, not a
> runtime env var. Set it to the URL the end-user's browser will use to reach the API
> (e.g. `https://api.your-domain.com`) — not an internal Docker hostname.

## 3. Database

Choose ONE:

- **Managed (Neon, recommended):** set the backend `DATABASE_URL` to your Neon pooled
  connection string (`...neon.tech/...?sslmode=require`). In `docker-compose.yml`, override
  the backend `DATABASE_URL` and you may remove the `postgres` service + `depends_on`.
- **Bundled Postgres:** keep the `postgres` service. `DATABASE_URL` already points at it.

**Migrations run automatically** on backend container startup
(`docker-entrypoint.sh` → `prisma migrate deploy`), including the `CREATE EXTENSION vector`.

### Optional seed data
```bash
# Inside the backend container / environment (DATABASE_URL set):
node seed-admin.js                 # creates an admin user — CHANGE the default password first
npm run db:seed-market-pricing     # seeds market comparables for the AI pricing agent (uses OpenAI)
```

## 4. Deploy with Docker Compose

```bash
cp .env.example .env          # then edit .env with real values
docker compose build          # NEXT_PUBLIC_API_URL is read from .env as a build arg
docker compose up -d
```

- Web:  http://localhost:3000  (map to your domain)
- API:  http://localhost:3001/api
- Uploaded images persist in the `backend_uploads` volume.

## 5. Manual build (without Compose)

```bash
# Backend
cd backend && npm ci && npx prisma generate && npm run build
npx prisma migrate deploy
node dist/src/main            # serves on $PORT (default 3001)

# Frontend
cd frontend && npm ci
NEXT_PUBLIC_API_URL="https://api.your-domain.com" npm run build
npm start                     # serves on 3000
```

## 6. Post-deploy checklist

- [ ] `GET /api` returns 200; `GET /api/agency/public/<known-slug>` returns agency JSON.
- [ ] Web loads and the chatbot answers (validates OpenAI + DB connectivity).
- [ ] `NEXT_PUBLIC_API_URL` points at the public API origin (check browser network calls).
- [ ] `CORS_ORIGIN` restricted to the web origin (see below).
- [ ] Default admin password changed.
- [ ] TLS/HTTPS terminated in front of both services.

## 7. Security notes

- **CORS:** set `CORS_ORIGIN` (comma-separated origins) on the backend to lock the API to
  your web domain. If unset, CORS defaults to permissive (dev convenience).
- **Admin credentials:** `seed-admin.js` uses a default password — change it before go-live.
- **Secrets:** provide keys via environment/secret manager only; never commit them.
