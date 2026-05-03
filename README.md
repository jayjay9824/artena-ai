# AXVELA AI

Cultural intelligence app — production: https://www.axvela.com

## Stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Mobile-first

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

## Branches

- `main` — production. Auto-deploys to https://www.axvela.com via Vercel.
- `rebuild/v2` — active rebuild. Vercel preview deploy on every push.
- `backup/pre-rebuild-2026-05-04` — tag pointing to last v1 production commit (`247ee22`). Recovery anchor.

## Folder layout

```
app/                 — App Router routes, layouts, route handlers
components/          — Reusable UI (added as needed)
lib/                 — Utilities, design tokens (added as needed)
public/              — Static assets
```
