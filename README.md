# LuxDrive — AI-Powered Car Rental Platform

A multi-tenant SaaS for car rental agencies, with AI agents that automate booking and pricing.

## Stack
- **Frontend:** Next.js 16 / React 19 (App Router)
- **Backend:** NestJS + Prisma (PostgreSQL + pgvector, on Neon)
- **AI:** OpenAI — conversational booking agent (function calling), Whisper (STT), TTS, and RAG-based pricing

## Features
- Per-agency public pages with a conversational AI booking assistant (text + voice)
- Fleet management with photo galleries, availability, and AI price suggestions
- Booking management (confirm / cancel / edit) with a printable quote (devis)
- Automatic client confirmation email when an agency confirms a booking (Gmail SMTP)
- Client CRM, expense/maintenance tracking, and per-vehicle profitability
- Admin approval workflow and role-based access (JWT + RBAC)

## Getting started
See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for setup, environment variables, and running the app.

```bash
# Backend
cd backend && npm install && npm run start:dev   # http://localhost:3001/api

# Frontend
cd frontend && npm install && npm run dev         # http://localhost:3000
```

## Email notifications (booking confirmations)

When an agency confirms a booking (`PATCH /api/bookings/:id/status` → `CONFIRMED`), the
client is automatically emailed a styled confirmation. Delivery uses **Gmail SMTP** via
`nodemailer` and is **best-effort** — a mail failure is logged but never breaks the
confirmation. If the mail env vars are unset, emailing is silently disabled.

Configure these in `backend/.env` (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `GMAIL_USER` | The Gmail address to send from |
| `GMAIL_APP_PASSWORD` | A 16-char Google **App Password** (requires 2-Step Verification on the account) — **not** the normal Gmail password. Leave empty to disable email. |
| `MAIL_FROM` | The `From` header shown to recipients, e.g. `LuxDrive <you@gmail.com>` |

**Getting the App Password:** [myaccount.google.com/security](https://myaccount.google.com/security)
→ enable **2-Step Verification** → [App passwords](https://myaccount.google.com/apppasswords)
→ create one (name it e.g. "LuxDrive") → paste the 16-character code (spaces don't matter).

**Reply-to:** replies are routed to the confirming agency's `publicEmail` when set, so client
replies reach the agency rather than the shared sender mailbox.

> **Note:** Gmail may briefly throttle a burst of sends from a newly-created App Password;
> the first send can take a moment. Normal one-at-a-time confirmations deliver fine. For
> higher volume or sending from your own domain, switch the transport to a provider like
> Resend/SendGrid in `src/mail/mail.service.ts`.
