# Visual AI Tutor

Live whiteboard tutor for STEM students: Gemini returns validated Excalidraw board JSON → draw + captions/TTS → board Q&A → quiz → lesson summary → Supabase Auth + TOTP.

Product spec: [`SPEC.md`](./SPEC.md) · Agent rules: [`AGENTS.md`](./AGENTS.md) · Stack: [`TECH.md`](./TECH.md) · Prior work: [`PRIOR_WORK.md`](./PRIOR_WORK.md)

## Status

**Scaffold / Core stubs** — auth, Gemini, Excalidraw player, and full Judge path are in progress during the hackathon build window.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase · Gemini 2.5 Flash · Zod · mathjs · Excalidraw (next) · Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
# fill Supabase + GEMINI keys when ready
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev |
| `npm run build` | Production build |
| `npm run start` | Serve build |
| `npm run lint` | ESLint |

## Live URL

_Add Vercel URL here after first deploy (Day 2)._

## Team lanes

| Person | Owns |
|--------|------|
| Uzair | Auth, schema, RLS, deploy |
| Taha | Gemini + Zod APIs, grading |
| Uzzam | Excalidraw / SVG board |
| Saad | Pack content, docs, gigs |
