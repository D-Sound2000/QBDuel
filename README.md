# QB Duel

Production-shaped MVP for a ranked 1v1 quiz bowl platform.

## Stack

- Next.js App Router frontend
- Supabase Auth + Postgres
- Socket.io authoritative match server
- QBReader server-side question sourcing
- Vitest domain and server tests

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

The app runs on `http://localhost:3000`. The WebSocket server defaults to `http://localhost:4000`.

Supabase is optional for local UI development. Without Supabase environment variables, API routes return seeded demo data and the WebSocket server uses an in-memory repository.

## Environment

See `.env.example` for required production variables.

## Database

Apply `supabase/migrations/0001_initial.sql` to a Supabase project before deploying.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
