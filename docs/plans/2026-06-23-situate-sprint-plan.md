# Situate — Sprint Plan

**Status:** ✅ **v1 feature-complete** — Sprints 1–5 all shipped (extraction → collector backend → runtime gating → admin/triage route → redaction hardening) · **Date:** 2026-06-23 (updated 2026-06-24) · **Design:** [`../DESIGN.md`](../DESIGN.md)

Two-phase format per house convention: **Phase 1** sizes the backlog and picks sprint shape; **Phase 2** is the per-epic execution deep-dive. IDs: epics `F-EPIC-N`, stories `FS-N`. Effort scale: XS / S / M / L / XL.

---

## Phase 1 — Sprint Planning (backlog)

### Where we are

The monorepo (`core` + `widget` + `server` + `admin` + `examples/vite-react`) is **v1 feature-complete**. **144 unit tests pass** (40 core / 43 widget / 48 server / 13 admin). Shipped: the Fastify collector with pluggable `StorageAdapter` (Files/SQLite) (Sprint 2, `3297efc`); runtime gating — `situate(config)` resolves `GET /config/:env`, fail-closed (Sprint 3, `9d2e369`); the embeddable `SituateAdmin` triage route — findings table, status lifecycle, screenshot viewing, CSV/markdown export, gating editor, behind a server-enforced admin token (Sprint 4, `aabf4d2`); and always-on best-effort screenshot redaction (Sprint 5, `a711c9f`) — masked paint verified live in the example host. Remaining items are all post-v1 backlog (B1–B5).

### Candidate items

The backend is the **keystone**: runtime gating, the allowlist, the admin route, and triage all depend on it. Sequence around that.

| # | Item | Notes | Effort |
|---|------|-------|--------|
| **F1** | Extraction & standalone overlay | Monorepo, core/widget split, styling decoupling, example host, ported tests, CI. | **DONE** |
| **F2** | Collector backend (Fastify + StorageAdapter) | Ingest + flag/allowlist config + admin query APIs; files + SQLite adapters. | **DONE** (`3297efc`) |
| **F3** | Runtime gating + auth context | Widget resolves flag/allowlist via `SituateAuthContext`; fail-closed prod. | **DONE** (`9d2e369`) |
| **F4** | Embeddable admin/triage route | Findings table, status, export, flag+allowlist toggle (host auth, `isAdmin`). Free-form tags deferred. | **DONE** (`aabf4d2`) |
| **F5** | Redaction hardening | Always-on mask of `data-uat-redact` + inputs + configured selectors; disable-screenshots switch; residual-risk docs. | **DONE** (`a711c9f`) |
| **F6** | Feature-request triage model | `SituateFindingStatus` lifecycle, category surfacing, CSV/markdown export. | **DONE** (`aabf4d2`, with F4) |
| **B1** | Postgres adapter | Production-grade store beyond SQLite. | M |
| **B2** | ~~Internal `Uat*` → `Situate*` rename~~ | Dropped — `Uat*` reads as the **UAT** inside sit·UAT·e; retained intentionally. | — |
| **B3** | Voting / roadmap board | Post-v1 product surface. | XL |
| **B4** | Framework-agnostic (non-React) widget | `core` is already React-free to enable this. | L |
| **B5** | Notifications hook (submitter status updates) | Email/webhook on status change. | M |

### Proposed sprint shape

- **Sprint 1 — Extraction (DONE):** F1.
- **Sprint 2 — Collector backend (keystone) (DONE — `3297efc`):** F2.
- **Sprint 3 — Runtime gating + auth (DONE — `9d2e369`):** F3.
- **Sprint 4 — Admin/triage route (DONE — `aabf4d2`):** F4 + F6.
- **Sprint 5 — Redaction hardening (DONE — `a711c9f`):** F5.
- **Deferred (post-v1 backlog):** B1–B5.

### Decisions needed before kickoff

- [x] ~~Confirm Fastify (vs. keeping the dependency-free `http` collector) for F2~~ — **Fastify** (DESIGN D9). `collector.mjs` retained as the zero-dep reference seed.
- [x] ~~Confirm default self-host store: SQLite for v1, Postgres deferred to B1~~ — **SQLite** default (`SITUATE_STORE=sqlite`); Files adapter for parity; Postgres deferred (B1).
- [ ] Confirm CI provider for the new repo (lint + build + test on PR). *(still open)*
- [ ] Confirm npm publish scope/visibility (`@situate/*`, public or private registry). *(still open)*

---

## Phase 2 — Epic deep-dives

### F-EPIC-1 — Extraction & standalone overlay ✅ Implemented (2026-06-23)

**Outcome:** a reusable, embeddable overlay extracted from an internal app, proven in a token-free host.

**Stories:** FS-1 monorepo scaffold · FS-2 core/widget split · FS-3 styling decoupling (preset + self-contained CSS, scoped `--tw-*`, no global leak) · FS-4 ported tests (59 green) · FS-5 example host + live verification · FS-6 report CLI.

**File checklist (shipped):**

| Area | Files |
|------|------|
| core | `packages/core/src/{types,constants,finding,selector,capture,location,transport,report}.ts`, `cli/report.ts`, `index.ts` |
| widget | `packages/widget/src/{UatRoot,UatToolbar,ElementPicker,CommentPopover}.tsx`, `{useDraggable,useUatSession}.ts`, `theme.css`, `situate-preset.cjs`, `index.ts` |
| server | `packages/server/src/{vite-plugin.ts,collector.mjs,index.ts}` |
| admin | `packages/admin/src/index.ts` (contracts only) |
| example | `examples/vite-react/{src,vite.config.ts,index.html}` |

---

### F-EPIC-2 — Collector backend (keystone) ✅ Implemented (2026-06-24, `3297efc`)

**Parent sprint:** Sprint 2 · **Status:** ✅ Shipped · **Effort:** L

**Governing decisions:** D3 (pluggable storage), D9 (Fastify). The Vite dev plugin stays the local sink; this epic added the deployable service. `collector.mjs` retained unchanged as the zero-dep reference.

**Execution order (all done):**
- **Step 0 — Entry gate:** ✅ `npm test` green; example host runs.
- **Step 1 (FS-7):** ✅ `StorageAdapter` (DESIGN §interfaces) in `core`; shared conformance suite run against an in-memory fake. *(test-first)*
- **Step 2 (FS-8):** ✅ `FilesAdapter` (JSONL+shots parity) + `SqliteAdapter` (`better-sqlite3`, v1 default) — both pass the conformance suite.
- **Step 3 (FS-9):** ✅ Fastify `buildServer()` exposing `POST /uat/feedback` (ingest contract preserved), `GET/PUT /config/:env` (strict-validated flag+allowlist), `GET /findings` (admin query), `GET /healthz`.
- **Step 4 (FS-10):** ✅ Screenshot storage via `saveScreenshot` (server-generated names); 25 MB body cap; CORS + `x-situate-token` parity with `collector.mjs`.
- **Step 5 (FS-11):** ✅ `main.ts` entrypoint (`npm run serve`) + multi-stage `Dockerfile` (native toolchain for `better-sqlite3`); `/healthz` healthcheck; config via env.

**Decisions made during build:**
- Gating/triage contracts (`SituateAuthContext`, `SituateFindingStatus`, `SituateGatingConfig`) **moved from `admin` into `core/gating.ts`** so `StorageAdapter` can reference them without violating the one-way `core`-never-imports-`admin` rule; `admin` re-exports them unchanged. Added a collector-managed `status` field to `UatFinding` (defaults to `'new'` on ingest).
- **Deferred:** `PUT /findings/:id/status` (status *mutation*) pushed to **S4 triage** — the adapter's `setStatus` exists and is conformance-tested, but no route is exposed yet.
- Wired a server Vitest suite + extended root `npm test` to fan out to `@situate/server`.

**Shipped files:** `packages/core/src/{gating,storage}.ts` (+ `types.ts`, `index.ts`); `packages/admin/src/index.ts` (re-export); `packages/server/src/{server,main,context}.ts`, `adapters/{files,sqlite}.ts`, `routes/{feedback,config,findings,health}.ts`, `Dockerfile`; tests under `packages/server/test/` (conformance + 3 adapters + routes via `fastify.inject()`).

**Exit criteria — all met:** ✅ ingest persists via SQLite (verified live: DB row + screenshot on disk); ✅ config API round-trips a `SituateGatingConfig` (and returns the fail-closed default when unset); ✅ `situate report` reads the same Files-adapter JSONL (parity verified); ✅ 42 adapter+route tests green (101 total).

---

### F-EPIC-3 — Runtime gating + auth context ✅ Implemented (2026-06-24, `9d2e369`)

**Parent sprint:** Sprint 3 · **Status:** ✅ Shipped · **Effort:** M

**Governing decisions:** D5 (flag + allowlist, fail-closed), D6 (host-supplied `SituateAuthContext`).

**Execution order (all done):**
- **Step 1 (FS-12):** ✅ `situate(config)` accepts `{ collectorUrl, auth: SituateAuthContext, environment }`; threaded through `UatRoot` → `useUatSession` (transport + environment).
- **Step 2 (FS-13):** ✅ On mount, `useGating` resolves `GET /config/:env`; renders only if `enabled` && (role/id match, or empty allowlist = all authenticated). *(test-first)*
- **Step 3 (FS-14):** ✅ **Fail-closed** — any error/non-200/unreachable/missing config in non-dev → no overlay; dev mode (no `collectorUrl`) stays on.
- **Step 4 (FS-15):** ✅ Build-flag-OR-runtime-gate; migration documented in DESIGN §Runtime gating + the example host.

**Decisions made during build:** the gating/triage contracts were moved into `core/gating.ts` in Sprint 2, so the widget imports `SituateAuthContext` directly from `@situate/core` (no new transport.ts changes needed).

**Shipped files:** `packages/widget/src/{gating.ts (new),UatRoot.tsx,useUatSession.ts,index.ts}`; `examples/vite-react/src/main.tsx`; `docs/DESIGN.md`. Tests: `packages/widget/test/{gating,root-gating}.test.*` (+16).

**Exit criteria — all met:** ✅ renders for an allowlisted user, hides for non-allowlisted (component tests against mocked collector + the live `/config/:env` contract from S2); ✅ fail-closed verified (disabled/non-200/unreachable all → hidden).

---

### F-EPIC-4 — Embeddable admin/triage route ✅ Implemented (2026-06-24, `aabf4d2`)

**Parent sprint:** Sprint 4 · **Status:** ✅ Shipped · **Effort:** L (with F6)

**Governing decisions:** D4 (embeddable, host auth), D8 (capture + triage).

**Execution order (all done):**
- **Step 1 (FS-16):** ✅ `<SituateAdmin auth collectorUrl adminToken environment />` — gated on `isAdmin`; reusability gate honored — `FindingsTable` primitive + `useFindings` hook + a typed collector `client` extracted before the feature view. *(test-first)*
- **Step 2 (FS-17):** ✅ Triage actions — set `SituateFindingStatus`; filter by severity/category/status (client-side). **Free-form tags deferred** (not in the data model — would cascade `UatFinding` → adapters → conformance → API; the exit criteria don't require them; `category` surfaced instead).
- **Step 3 (FS-18):** ✅ Gating editor — toggle `enabled`, edit `allowedRoles`/`allowedUserIds` → `PUT /config/:env`.
- **Step 4 (FS-19, = F6):** ✅ Export (CSV + markdown via `renderReport`); screenshot viewing — blob-fetched through the adapter, not static file-serving.

**Decisions made during build:**
- **Server-side admin auth added** (was an exit-criterion gap — client `isAdmin` is UX only): an `x-situate-admin-token` guard on `GET /findings`, `PUT /findings/:id/status`, `GET /shots/:file`, and `PUT /config/:env`. `GET /config/:env` stays **open** (the widget reads it for gating). Token enforced when set; **must be set in production** (documented residual; collector should also sit behind host auth).
- **`PUT /findings/:id/status` route added** (deferred from S2) and **`readScreenshot()` added to `StorageAdapter`** + all adapters + conformance (round-trip + path-traversal reject) so screenshots serve through the abstraction, not the FS.

**Shipped files:** `packages/admin/src/{SituateAdmin,FindingsTable,GatingEditor}.tsx, {useFindings,client,export,index}.ts`; `packages/server/src/{context.ts,routes/{findings,config}.ts,server.ts,main.ts}`, `packages/core/src/storage.ts`; `examples/vite-react/src/App.tsx` (`?admin` mount). Tests under `packages/{admin,server}/test/` (+16).

**Exit criteria — all met:** ✅ an admin mounts the route in the example host (`?admin`); reviews findings, sets statuses, flips the gating flag, exports CSV/markdown — all via the collector API; ✅ non-admins blocked client-side **and** at the API (live-verified: token guard 401→200, status mutation, `image/png` screenshot serving).

---

### F-EPIC-5 — Redaction hardening ✅ Implemented (2026-06-24, `a711c9f`)

**Parent sprint:** Sprint 5 · **Status:** ✅ Shipped · **Effort:** M

**Governing decisions:** D7 (always-on redaction; disable-able; residual risk).

**Execution order (all done):**
- **Step 1 (FS-20):** ✅ Redaction pass in `core/redaction.ts`, applied in `capture.ts` — masks `[data-uat-redact]`, all form fields, and `redactSelectors` before the PNG, then restores the DOM; `selector.ts` blanks `textSnippet` for redacted elements. *(test-first — pure helpers unit-tested; paint live)*
- **Step 2 (FS-21):** ✅ `situate({ captureScreenshots: false })` deployment switch → metadata-only feedback (threaded through `useUatSession`).
- **Step 3 (FS-22):** ✅ DESIGN §Redaction rewritten (shipped state + named residual risk + a **host-integration checklist**); CLAUDE.md + example caption updated.

**Implementation note:** masking is hybrid — form controls (can't host children) get solid-bg + transparent-text; other regions get a solid cover overlay so descendant images/text don't reach the raster. Applied to the live DOM for the brief capture window, then reverted (named in the residual-risk section).

**Shipped files:** `packages/core/src/{redaction.ts (new),capture.ts,selector.ts,index.ts}`; `packages/widget/src/{gating.ts,UatRoot.tsx,useUatSession.ts}`; `docs/DESIGN.md`, `CLAUDE.md`, `examples/vite-react/src/App.tsx`. Tests: `packages/core/test/redaction.test.ts` (+8).

**Exit criteria — all met:** ✅ marked regions + form fields masked in a **live capture** (paint-verified in the example host: the `[data-uat-redact]` card is 100% mask color `rgb(17,24,39)` in the captured PNG; the unmarked card is not); ✅ screenshots disable-able per deployment; ✅ residual-risk + checklist documented.

---

## Deferred — parked decisions (post-v1 backlog)

| Item | Reason deferred | Revisit when |
|------|-----------------|--------------|
| B1 Postgres adapter | SQLite covers v1 self-host | First multi-tenant / HA deployment |
| B2 `Uat*` → `Situate*` rename | Keep extraction faithful + tests stable | After Sprint 5, as a dedicated rename PR |
| B3 Voting / roadmap board | Out of v1 scope (D8) | When feature-request volume warrants prioritisation UX |
| B4 Framework-agnostic widget | React covers current consumers | First non-React host asks to embed |
| B5 Notifications hook | Not needed for internal triage | When external submitters need status updates |
