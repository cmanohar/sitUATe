# Situate

An **embeddable in-app feedback + UAT overlay** for any Vite/React app. Testers and end-users
select an on-screen element (or note the whole screen), add a graded comment and a private,
**redacted** screenshot — which becomes structured findings, a markdown report, and an AI-fix
worklist.

Situate began as an internal dev-only UAT overlay and is being spun
out into a reusable, runtime-toggleable platform. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full
design and [`docs/plans/2026-06-23-situate-sprint-plan.md`](docs/plans/2026-06-23-situate-sprint-plan.md)
for the build-out roadmap.

## What's here (v0.1 — extraction milestone)

This repo currently delivers the **extracted, working overlay** as an npm-consumable React widget,
plus the design + sprint plan for the platform features (backend, runtime gating, admin console,
redaction hardening) that follow.

```
packages/
  core/      @situate/core      — framework-agnostic logic (types, capture, selector, report, transport)
  widget/    @situate/widget  — the embeddable React overlay (peer-deps React)
  server/    @situate/server    — collector seed (Vite dev plugin + standalone ingest) [Sprint 2 → Fastify]
  admin/     @situate/admin     — embeddable admin/triage route [Sprint 4 — stub]
examples/
  vite-react/                         — minimal host proving the widget embeds + styles standalone
docs/
  DESIGN.md                           — platform design
  plans/2026-06-23-situate-sprint-plan.md
```

## Quick start

```bash
npm install                 # install workspace deps
npm run build               # build core → widget → server → admin
npm test                    # run core + widget unit tests (Vitest)
npm run dev:example         # run the example host with the overlay mounted
```

## Embedding in your app (preview API)

```tsx
import { situate } from '@situate/widget';
import '@situate/widget/styles.css'; // self-contained, theme-able via CSS variables

if (import.meta.env.VITE_SITUATE_ENABLED === 'true') {
  situate();
}
```

The widget ships a self-contained stylesheet driven by CSS variables (`--st-primary-rgb`, etc.), so
it renders correctly in **any** host without requiring the origin app's design tokens. Override the
variables to theme it. Tailwind hosts can instead use the shipped preset (`@situate/widget/preset`).

## Heritage

Extracted from an internal dev-only UAT overlay. The internal `Uat*` identifiers are retained
deliberately — they read as the **UAT** inside "sit·UAT·e", so no rename is planned.
