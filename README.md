# Flow

An **embeddable in-app feedback + UAT overlay** for any Vite/React app. Testers and end-users
select an on-screen element (or note the whole screen), add a graded comment and a private,
**PHI-redacted** screenshot — which becomes structured findings, a markdown report, and an AI-fix
worklist.

Flow began as the dev-only UAT overlay inside [SerenityEMR](../DTP_HealthRecord) and is being spun
out into a reusable, runtime-toggleable platform. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full
design and [`docs/plans/2026-06-23-flow-sprint-plan.md`](docs/plans/2026-06-23-flow-sprint-plan.md)
for the build-out roadmap.

## What's here (v0.1 — extraction milestone)

This repo currently delivers the **extracted, working overlay** as an npm-consumable React widget,
plus the design + sprint plan for the platform features (backend, runtime gating, admin console,
redaction hardening) that follow.

```
packages/
  core/      @cmanohar/flow-core      — framework-agnostic logic (types, capture, selector, report, transport)
  widget/    @cmanohar/flow-feedback  — the embeddable React overlay (peer-deps React)
  server/    @cmanohar/flow-server    — collector seed (Vite dev plugin + standalone ingest) [Sprint 2 → Fastify]
  admin/     @cmanohar/flow-admin     — embeddable admin/triage route [Sprint 4 — stub]
examples/
  vite-react/                         — minimal host proving the widget embeds + styles standalone
docs/
  DESIGN.md                           — platform design
  plans/2026-06-23-flow-sprint-plan.md
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
import { mountFlow } from '@cmanohar/flow-feedback';
import '@cmanohar/flow-feedback/styles.css'; // self-contained, theme-able via CSS variables

if (import.meta.env.VITE_FLOW_ENABLED === 'true') {
  mountFlow();
}
```

The widget ships a self-contained stylesheet driven by CSS variables (`--flow-primary-rgb`, etc.), so
it renders correctly in **any** host without requiring SerenityEMR's design tokens. Override the
variables to theme it. Tailwind hosts can instead use the shipped preset (`@cmanohar/flow-feedback/preset`).

## Heritage

Extracted from `mvp/src/uat/` in SerenityEMR. The internal `Uat*` identifiers are retained for this
milestone and renamed to `Flow*` in a later sprint (see the sprint plan).
