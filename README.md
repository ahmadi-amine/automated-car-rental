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
