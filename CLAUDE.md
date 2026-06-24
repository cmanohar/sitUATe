# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Situate is an **embeddable in-app feedback + UAT overlay** for Vite/React apps, extracted from an
internal dev-only overlay and being grown into a runtime-toggleable, admin-managed
platform. It's an npm-workspaces monorepo. The full design lives in `docs/DESIGN.md` and the roadmap in
`docs/plans/2026-06-23-situate-sprint-plan.md` — read those before changing architecture.

## Commands

```bash
npm install            # install all workspace deps
npm run build          # build in dependency order: core → widget → server → admin (root enforces order)
npm test               # core + widget Vitest suites
npm run typecheck      # tsc --noEmit across all workspaces
npm run dev:example    # run examples/vite-react host with the overlay mounted + local file sink
npm run report         # render a markdown findings report via the core CLI (situate report)
```

Per-package (run with `-w <pkg>` from root, or inside the package dir):

```bash
npm test -w @situate/core          # one package's tests
npm test -w @situate/widget
npx vitest run path/to/file.test.ts      # a single test file (from inside the package)
npx vitest run -t "test name"            # a single test by name
node packages/server/src/collector.mjs   # standalone ingest collector (dependency-free)
```

The widget build is two steps (`tsc` then `tailwindcss` → `dist/styles.css`); the CSS is prebuilt from
`src/theme.css` with `tailwind.config.cjs`, not generated at consumer install time.

## Architecture (the big picture)

Four packages under `packages/`, plus an example host:

| Package | npm name | Role |
|---------|----------|------|
| `core` | `@situate/core` | **Framework-agnostic engine** — types, `buildFinding`, selector/element metadata, `captureElement/Viewport`, `submitFinding/flushQueue` (offline-queued transport), `renderReport`, and the `situate report` CLI. Depends only on `html-to-image`. |
| `widget` | `@situate/widget` | **Embeddable React overlay.** `situate()` appends a root to `<body>` and renders `UatRoot`. Ships a self-contained `styles.css` + a Tailwind `preset`. React/react-dom are **peer** deps. |
| `server` | `@situate/server` | **Collector seed** — a Vite dev plugin (`situateVitePlugin()`) local sink + a dependency-free standalone ingest (`src/collector.mjs`). Sprint 2 evolves this into Fastify + storage adapters. |
| `admin` | `@situate/admin` | **Embeddable triage route** (stub). Today it only *exports contracts* — `SituateAuthContext`, `SituateFindingStatus`, `SituateGatingConfig`; components land Sprint 4. |

Key invariants that span files:

- **Dependency direction is one-way.** `widget` and `admin` import `core`; nothing imports `widget`;
  the widget never imports `server`. The host app is the only thing that wires them together — via a
  single `situate()` call behind a flag.
- **`core` is deliberately React-free** so redaction and future non-React surfaces are possible. Keep
  React out of `packages/core`.
- **Data path is environment-dependent.** Dev/local: widget POSTs to the Vite plugin →
  `.situate/sessions/<date>-<user>/findings.jsonl` + `shots/`; `situate report` renders markdown from that
  JSONL. Self-host: widget POSTs to the collector (`POST /uat/feedback`), which writes the *same* JSONL
  layout under `SITUATE_STORAGE_DIR`. Both consume one finding shape from `core`.
- **Gating is build-time today** (`VITE_SITUATE_ENABLED`); runtime gating (remote flag + role allowlist,
  fail-closed in prod) is designed but not yet implemented (Sprint 3).
- **Auth is host-supplied** via `SituateAuthContext` (`{ userId, displayName?, roles[], isAdmin }`). Situate
  never owns identity — do not add an identity-provider dependency.

## Conventions / gotchas

- **ESM with explicit `.js` extensions on relative imports** (e.g. `import { UatRoot } from './UatRoot.js'`)
  even from `.ts` sources — required so every package resolves under Node and bundlers. TS config uses
  `moduleResolution: "Bundler"`, `verbatimModuleSyntax`, `isolatedModules`, strict, `noUnusedLocals/Parameters`.
- **Heritage `Uat*` naming is intentional.** The extracted overlay keeps internal `Uat*` identifiers
  (`UatRoot`, `UatToolbar`, `useUatSession`, `UAT_ROOT_ATTR`, the `/uat/feedback` route). They read as
  the **UAT** inside sit·UAT·e, so no rename is planned — **do not bulk-rename** them; it would break
  tests for no benefit. `situate` is the public name; `mountUat` is a deprecated alias.
- **Redaction is implemented (Sprint 5) — best-effort, always-on.** Before any PNG, `core/redaction.ts`
  masks `[data-uat-redact]`, all form fields, and host `redactSelectors`, then restores the DOM;
  redacted `textSnippet` is blanked. It is **best-effort, not a guarantee** — see DESIGN §Redaction
  residual risk + the host-integration checklist. Screenshots are disable-able per deployment
  (`situate({ captureScreenshots: false })`). Masked *paint* is verified live (jsdom has no layout
  engine); the redaction *logic* is unit-tested. Server **always generates screenshot filenames**
  (`randomUUID().png`) and admin reads reject traversal — never trust client-supplied paths.
- **Styling is decoupled from any host.** Components emit token classes (e.g. `bg-surface-container`)
  that were the origin app's; the shipped preset/stylesheet back them with CSS variables
  (`--st-*-rgb`, RGB-channel format so opacity modifiers work). Tailwind preflight is disabled and
  `--tw-*` seeds are scoped to `[data-uat-root]` so importing the CSS never clobbers the host.
- **Tests** are Vitest + jsdom (core) / + Testing Library (widget). jsdom has no layout engine, so
  capture/redaction *paint* is verified live in `examples/vite-react` (see `docs/evidence/`), not in units.
- **Never commit** `.situate/sessions/` or `.situate/data/` — they hold real feedback + screenshots (gitignored).
- The `dist/` dirs are committed-looking build output but gitignored; the example consumes the **built**
  widget, so rebuild (`npm run build`) after changing `core`/`widget` before testing the example.
