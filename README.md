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
- Transactional emails (Gmail SMTP): client gets a request-received acknowledgement, then a confirmation or cancellation notice; the agency is emailed each new request
- Client CRM, expense/maintenance tracking, and per-vehicle profitability
- Optional client accounts with email-verified registration (guest booking still works)
- Admin approval workflow and role-based access (JWT + RBAC)

## Getting started
See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for setup, environment variables, and running the app.

```bash
# Backend
cd backend && npm install && npm run start:dev   # http://localhost:3001/api

# Frontend
cd frontend && npm install && npm run dev         # http://localhost:3000
```

## Email notifications

The app sends styled transactional emails (HTML + plain-text, in **French**, each with a
booking reference like `LX-3F9A2C`) at key booking moments.
Delivery uses **Gmail SMTP** via `nodemailer` and is **best-effort** — a mail failure is
logged but never breaks the request. If the mail env vars are unset, emailing is silently
disabled.

| Trigger | Recipient | Email |
|---|---|---|
| Guest submits a booking (`POST /api/bookings/public`) | Client | "Request received" acknowledgement (pending confirmation) |
| Same event, if the agency has a `publicEmail` | Agency | "New booking request" with customer + booking details (reply-to = client) |
| Agency confirms (`PATCH /api/bookings/:id/status` → `CONFIRMED`) | Client | "Booking confirmed" |
| Agency cancels (`PATCH /api/bookings/:id/status` → `CANCELLED`) | Client | "Booking cancelled" |
| Client registers (`POST /api/auth/customer/register`) | Client | Email-verification link (account inactive until confirmed) |

Client emails set **reply-to** to the agency's `publicEmail` (when set) so replies reach
the agency; the agency notice sets reply-to to the client.

Configure these in `backend/.env` (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `GMAIL_USER` | The Gmail address to send from |
| `GMAIL_APP_PASSWORD` | A 16-char Google **App Password** (requires 2-Step Verification on the account) — **not** the normal Gmail password. Leave empty to disable email. |
| `MAIL_FROM` | The `From` header shown to recipients, e.g. `LuxDrive <you@gmail.com>` |

**Getting the App Password:** [myaccount.google.com/security](https://myaccount.google.com/security)
→ enable **2-Step Verification** → [App passwords](https://myaccount.google.com/apppasswords)
→ create one (name it e.g. "LuxDrive") → paste the 16-character code (spaces don't matter).

> **Note:** Gmail may briefly throttle a burst of sends from a newly-created App Password;
> the first send can take a moment. Normal one-at-a-time confirmations deliver fine. For
> higher volume or sending from your own domain, switch the transport to a provider like
> Resend/SendGrid in `src/mail/mail.service.ts`.
