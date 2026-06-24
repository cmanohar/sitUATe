# Situate — Design

**Status:** Approved (v0.1 extraction shipped); platform sprints planned · **Date:** 2026-06-23 · **Repo:** `~/myPyWrks/Flow` (dir rename → `Situate` pending) · **Sprint plan:** [`plans/2026-06-23-situate-sprint-plan.md`](plans/2026-06-23-situate-sprint-plan.md)

## Context / Problem

The UAT feedback overlay built inside an internal app works well: select an on-screen element (or note the whole screen), add a graded comment + a private screenshot, and a markdown findings doc + AI-fix worklist falls out. But it is (a) trapped in one repo, and (b) **dev-only** — gated at build time so production ships zero overlay bytes.

Two needs drive this project:

1. **Extract** the overlay into a reusable module other Vite/React apps can embed.
2. **Evolve** it from a dev-only QA tool into a **runtime-toggleable, admin-managed feedback + feature-request platform** that can run in staging/production for a controlled set of users — without losing the "embed into a Vite app" property.

Situate is generic: it carries no domain semantics of its own. But its first consumer is a digital health application, so sensitive-data safety (screenshots of a live app) is a first-class design constraint, not an afterthought.

## Goal

A monorepo that ships an **npm-consumable React widget** (embeds into any Vite/React app), a **self-hostable collector backend**, and an **embeddable admin/triage route** — tied together by **pluggable storage and auth** so the module stays host-agnostic and reusable across repos.

## Architecture

```
                      ┌──────────────────────────── host app (e.g. a digital health app) ───────────────────────────┐
                      │                                                                                      │
   @situate/widget (widget)            @situate/admin (embeddable route, host auth)            │
        │  situate() + styles.css                    │  /admin/feedback  (isAdmin only)                    │
        │  capture · select · redact                   │  triage table · status · flag/allowlist toggle      │
        └──────────────┬───────────────┘              └───────────────┬─────────────────────────────────────┘
                       │ POST finding (+png)                          │ GET/PUT config · GET findings
                       ▼                                              ▼
              ┌─────────────────────────── @situate/server (collector) ───────────────────────────┐
              │  ingest API · flag+allowlist config API · admin query API                                │
              │  StorageAdapter:  files (dev)  |  SQLite/Postgres (self-host)  |  HTTP/no-op             │
              └──────────────────────────────────────────────────────────────────────────────────────────┘

   @situate/core — framework-agnostic engine shared by all of the above
      types · finding · selector · capture(+redaction) · location · transport · report · CLI (situate report)
```

**Data path by environment:**
- **DEV / local UAT** → widget POSTs to the Vite dev plugin → `.situate/sessions/<date>-<user>/findings.jsonl` + `shots/`. `situate report` renders markdown.
- **SELF-HOST (staging/prod)** → widget POSTs to the collector → `StorageAdapter` (SQLite/Postgres). Admin route reads/triages via the collector's API; runtime gating is served by the same collector.

## Decisions (approved)

| # | Decision | Rationale / Consequence |
|---|----------|-------------------------|
| **D1** | **Distribution:** npm package, React + Tailwind as *peer/optional* deps. | Embeds into any Vite/React app with a few lines. Named **Situate** (the "UAT" lives inside sit·UAT·e); packages live under a dedicated `@situate/*` scope (`@situate/core`, `@situate/widget`, `@situate/server`, `@situate/admin`) — no per-package prefix, no hyphens. |
| **D2** | **Shape:** monorepo — `core` (engine) + `widget` (overlay) + `server` (collector) + `admin` (embeddable route). | "Full platform" ambition delivered while keeping the widget independently embeddable. `core` split (React-free) enables redaction + future non-React surfaces. |
| **D3** | **Storage:** a pluggable `StorageAdapter` interface; adapters for files (dev), SQLite/Postgres (self-host), and HTTP/no-op. | Module stays backend-agnostic; consumers pick. Most reusable across repos. |
| **D4** | **Admin console:** an **embeddable** React route/components mounted in the host (reuses host auth), not a standalone app. | Tighter integration, no second auth system. Host owns the `/admin/feedback` route. |
| **D5** | **Runtime gating:** remote on/off flag per environment (served by the collector) + per-user/role **allowlist**; widget renders only for allowlisted users. **Fail-closed** in prod. | Safe for prod, controllable without redeploy. The embedded admin route edits the flag/allowlist. |
| **D6** | **Auth:** a pluggable **`SituateAuthContext`** — the host passes `{ userId, displayName, roles[], isAdmin }`. Situate never owns identity. **No identity-provider dependency.** | Works with any identity provider. Keeps the module generic and the host's auth stack out of Situate. |
| **D7** | **Sensitive data / screenshots:** **always-on redaction** by default (mask `[data-uat-redact]`, all form inputs, host-configurable selectors; strip text snippets) — and screenshots remain fully **disable-able** per deployment. | Safe by default. Best-effort masking is a *named residual risk* (see §Redaction), not a complete guarantee. |
| **D8** | **Feature requests (v1):** capture + admin triage (category, status, tags, export). No voting/roadmap board yet. | Smallest viable platform; extend later (see Out of scope). |
| **D9** | **Backend runtime:** a light Node service (recommended: **Fastify**) evolving the existing dependency-free collector, with the D3 adapters. | Self-hostable, framework-light, low ops. Avoids serverless lock-in; serverless remains a deployment option. |

## Package boundaries

| Package | Does | Interface (key exports) | Depends on |
|---------|------|--------------------------|------------|
| `@situate/core` | Framework-agnostic engine + report CLI. | `buildFinding`, `extractElementMeta`, `captureElement/Viewport`, `submitFinding/flushQueue`, `renderReport`, all types; bin `situate report`. | `html-to-image` only |
| `@situate/widget` (widget) | The embeddable React overlay + self-contained stylesheet + Tailwind preset. | `situate()`, `UatRoot`, `./styles.css`, `./preset`. | core; peer `react`, `react-dom`; `lucide-react` |
| `@situate/server` | Collector: Vite dev plugin (local sink) + standalone ingest (`npm run collect`); → Fastify + adapters (Sprint 2). | `situateVitePlugin()`; `collector.mjs`. | peer `vite` (optional) |
| `@situate/admin` | Embeddable triage route/components + the gating-config editor (Sprint 4). | `SituateAuthContext`, `SituateFindingStatus`, `SituateGatingConfig` (contracts published now; components Sprint 4). | core; peer `react` |

Each unit answers: *what it does / how you use it / what it depends on*. The widget never imports the server; the host wires them. The only reverse dependency is the host's single `situate()` call behind a flag.

## Pluggable interfaces

```ts
// Storage — the collector writes through this; adapters are swappable (D3).
interface StorageAdapter {
  saveFinding(f: UatFinding): Promise<void>;
  saveScreenshot(findingId: string, png: Buffer): Promise<string>; // returns server-generated filename
  listFindings(query: { from?: string; to?: string; status?: SituateFindingStatus }): Promise<UatFinding[]>;
  setStatus(findingId: string, status: SituateFindingStatus): Promise<void>;
  getGatingConfig(env: string): Promise<SituateGatingConfig>;
  setGatingConfig(env: string, cfg: SituateGatingConfig): Promise<void>;
}

// Auth — supplied by the host; Situate never owns identity (D6).
interface SituateAuthContext {
  userId: string;
  displayName?: string;
  roles: string[];
  isAdmin: boolean;
}

// Transport config the widget already uses (extended for gating in Sprint 3).
interface TransportConfig { collectorUrl?: string; fetchImpl?: typeof fetch; }
```

`SituateAuthContext`, `SituateFindingStatus`, and `SituateGatingConfig` are already exported (type-checked) from `@situate/admin` so the contracts are concrete today.

## Runtime gating model (D5)

1. On mount, the widget asks the collector: **"is Situate on for this user, in this environment?"** — passing the host-supplied `SituateAuthContext`.
2. The collector returns the env's `SituateGatingConfig` (`enabled`, `allowedRoles`, `allowedUserIds`); the widget renders only if `enabled` **and** the user matches a role/id.
3. **Fail-closed:** any error, missing config, or absent collector in a non-dev environment → overlay does not render. Dev mode (no `collectorUrl`) stays on for local UAT.
4. The embedded admin route (D4) edits the config via the collector's config API — flips on/off and edits the allowlist **without a redeploy**.

Until Sprint 3 lands, gating remains **build-time** (`VITE_SITUATE_ENABLED`), exactly as the extracted overlay ships today.

## Styling decoupling

The components emit token classes (`bg-surface-container`, `text-on-surface-variant`, severity classes). Those tokens were **the origin app's** — an arbitrary host won't define them, so the widget would render broken. Resolution:

- A **Tailwind preset** (`@situate/widget/preset`) defines Situate's tokens as **CSS-variable-backed colours** in RGB-channel format (so opacity modifiers like `bg-primary/10` keep working). Defaults ship with the package; override any `--st-*-rgb` to re-theme.
- A **self-contained stylesheet** (`@situate/widget/styles.css`) is prebuilt from the widget source with that preset. **Preflight is disabled** so importing it never clobbers the host; the few `--tw-*` defaults that `ring`/`shadow` utilities need are seeded **scoped to `[data-uat-root]`**, so nothing global is emitted.

Consumers either `import '@situate/widget/styles.css'` (no Tailwind required) or add the preset to their own Tailwind config. **Verified:** the example host defines no Tailwind and no origin-app tokens, yet the overlay (launcher, hint bar, popover, severity chips, focus ring) renders correctly — see [`evidence/`](evidence/).

## Redaction & sensitive data (D7) — including residual risk

> **Current state (v0.1):** redaction is **not yet implemented** — screenshots are captured **as-is, unredacted** (parity with the original internal overlay). Redaction is F-EPIC-5 (Sprint 5). Until it lands, keep `captureScreenshots` off, or run the overlay only against dev/clone (non-sensitive) data. The behaviour below is the *target* design.

- **Always-on by default.** Before any screenshot is produced, the capture step masks: elements marked `[data-uat-redact]`, all form inputs (`input`/`textarea`/`select`/`[contenteditable]`), and any host-configured selectors. Captured `textSnippet` metadata is stripped/blanked for redacted regions.
- **Screenshots are disable-able** per deployment (metadata-only feedback). Belt-and-suspenders for the sensitive-data case.
- **Server-generated filenames** only — client never supplies screenshot paths (path-traversal safe). Offline retry queue holds metadata only, never base64 images.

> **Residual risk (named).** Best-effort masking is **not** a guarantee that zero sensitive data ever reaches a screenshot — a screen could expose sensitive data outside any marked region. Mitigations the host must own: disciplined `data-uat-redact` annotation, the option to disable screenshots entirely, and restricting prod gating to a trusted allowlist (D5). **If Situate is ever pointed at a live digital health application in production, that consuming app must add the appropriate safeguard + control before enabling screenshots** — Situate surfaces the capability; the consuming app's compliance process governs its use.

## Feature-request model (v1, D8)

A finding already carries `category: 'bug' | 'change' | 'question'`. The platform adds a triage lifecycle (`SituateFindingStatus`: `new → triaged → planned → in-progress → shipped | declined | duplicate`) managed in the admin route. v1 is **capture + triage + export** — no public board, voting, or roadmap.

## Testing

- **core** (Vitest + jsdom): `finding`, `selector`, `location`, `transport` (offline queue), `report` (markdown golden output). 32 tests.
- **widget** (Vitest + jsdom + Testing Library): `useDraggable`, `UatToolbar`, `CommentPopover`, `ElementPicker`, `UatRoot`. 27 tests.
- **Live**: the `examples/vite-react` host proves mount + styling decoupling + the local file sink (Playwright screenshots in `evidence/`). Capture/redaction paint is verified live (jsdom has no layout engine).
- Per-sprint additions: collector adapter tests, gating-resolution tests, admin triage tests, redaction-mask tests (Sprints 2–5).

## Build order

1. `core` (no internal deps) → 2. `widget` (+ Tailwind `styles.css`) → 3. `server` → 4. `admin`. The root `build` script enforces this order; the example consumes the built widget (proving the real install experience). ESM relative imports carry explicit `.js` extensions so every package is Node- and bundler-resolvable.

## Out of scope (v1)

- Voting / upvotes, dedupe-merge, public or internal **roadmap board** (post-v1 backlog).
- A **framework-agnostic** (non-React) widget — `core` is already React-free to enable this later.
- A specific identity-provider adapter — explicitly excluded; auth is host-supplied (D6).
- Renaming internal `Uat*` identifiers to `Situate*` — deferred to a dedicated sprint to keep the extraction faithful and tests stable.
