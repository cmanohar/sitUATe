# Situate — Sprint Plan

**Status:** Sprints 1–2 shipped (extraction + collector backend); Sprints 3–5 planned · **Date:** 2026-06-23 (updated 2026-06-24) · **Design:** [`../DESIGN.md`](../DESIGN.md)

Two-phase format per house convention: **Phase 1** sizes the backlog and picks sprint shape; **Phase 2** is the per-epic execution deep-dive. IDs: epics `F-EPIC-N`, stories `FS-N`. Effort scale: XS / S / M / L / XL.

---

## Phase 1 — Sprint Planning (backlog)

### Where we are

The overlay is **extracted and working** as a monorepo (`core` + `widget` + `server` + `admin` + `examples/vite-react`), and the **collector backend is now built** (Sprint 2, `3297efc`). 101 unit tests pass (32 core / 27 widget / 42 server); the example host proves the widget mounts and styles itself with no host design tokens; `situate report` renders markdown; the Fastify collector persists findings via a pluggable `StorageAdapter` (Files/SQLite) and round-trips a `SituateGatingConfig`. Remaining work (runtime gating, admin route, redaction hardening) is **designed but not built**.

### Candidate items

The backend is the **keystone**: runtime gating, the allowlist, the admin route, and triage all depend on it. Sequence around that.

| # | Item | Notes | Effort |
|---|------|-------|--------|
| **F1** | Extraction & standalone overlay | Monorepo, core/widget split, styling decoupling, example host, ported tests, CI. | **DONE** |
| **F2** | Collector backend (Fastify + StorageAdapter) | Ingest + flag/allowlist config + admin query APIs; files + SQLite adapters. | **DONE** (`3297efc`) |
| **F3** | Runtime gating + auth context | Widget resolves flag/allowlist via `SituateAuthContext`; fail-closed prod. | M |
| **F4** | Embeddable admin/triage route | Findings table, status/tags, export, flag+allowlist toggle (host auth, `isAdmin`). | L |
| **F5** | Redaction hardening | Always-on mask of `data-uat-redact` + inputs + configured selectors; disable-screenshots switch; residual-risk docs. | M |
| **F6** | Feature-request triage model | `SituateFindingStatus` lifecycle, category surfacing, CSV/markdown export. | S |
| **B1** | Postgres adapter | Production-grade store beyond SQLite. | M |
| **B2** | ~~Internal `Uat*` → `Situate*` rename~~ | Dropped — `Uat*` reads as the **UAT** inside sit·UAT·e; retained intentionally. | — |
| **B3** | Voting / roadmap board | Post-v1 product surface. | XL |
| **B4** | Framework-agnostic (non-React) widget | `core` is already React-free to enable this. | L |
| **B5** | Notifications hook (submitter status updates) | Email/webhook on status change. | M |

### Proposed sprint shape

- **Sprint 1 — Extraction (DONE):** F1.
- **Sprint 2 — Collector backend (keystone) (DONE — `3297efc`):** F2.
- **Sprint 3 — Runtime gating + auth (next):** F3.
- **Sprint 4 — Admin/triage route:** F4 + F6.
- **Sprint 5 — Redaction hardening:** F5.
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

### F-EPIC-3 — Runtime gating + auth context

**Parent sprint:** Sprint 3 · **Status:** ❌ Not started · **Effort:** M

**Governing decisions:** D5 (flag + allowlist, fail-closed), D6 (host-supplied `SituateAuthContext`).

**Execution order:**
- **Step 1 (FS-12):** `situate(config)` accepts `{ collectorUrl, auth: SituateAuthContext, environment }`; thread through `useUatSession`.
- **Step 2 (FS-13):** On mount, resolve gating from the collector; render only if `enabled` && role/id match. *(test-first: gating-resolution unit tests)*
- **Step 3 (FS-14):** **Fail-closed** in non-dev environments (error/missing config/no collector → no overlay); dev mode stays on.
- **Step 4 (FS-15):** Replace the build-time `VITE_SITUATE_ENABLED`-only path with build-flag-OR-runtime-gate; document the migration.

**File checklist:** `packages/widget/src/{index.ts,useUatSession.ts,gating.ts}`, `packages/core/src/transport.ts`, tests under `packages/widget/test/`.

**Exit criteria:** widget renders for an allowlisted user and hides for a non-allowlisted one against a live collector; fail-closed verified.

---

### F-EPIC-4 — Embeddable admin/triage route

**Parent sprint:** Sprint 4 · **Status:** ❌ Not started · **Effort:** L (with FS-6)

**Governing decisions:** D4 (embeddable, host auth), D8 (capture + triage).

**Execution order:**
- **Step 1 (FS-16):** `<SituateAdmin auth={SituateAuthContext} collectorUrl=… />` — gated on `isAdmin`; reusability gate first (extract a `FindingsTable` primitive + a `useFindings` hook before feature views). *(test-first)*
- **Step 2 (FS-17):** Triage actions — set `SituateFindingStatus`, tags, filter by severity/category/status.
- **Step 3 (FS-18):** Gating editor — toggle `enabled`, edit `allowedRoles`/`allowedUserIds` (writes config API).
- **Step 4 (FS-19, = FS-F6):** Export (CSV + markdown via `renderReport`); screenshot viewing by server filename.

**File checklist:** `packages/admin/src/{SituateAdmin.tsx,FindingsTable.tsx,GatingEditor.tsx,useFindings.ts,index.ts}`, tests under `packages/admin/test/`.

**Exit criteria:** an admin mounts the route in a host, reviews findings, sets statuses, flips the runtime flag, and exports — all via the collector API; non-admins are blocked.

---

### F-EPIC-5 — Redaction hardening

**Parent sprint:** Sprint 5 · **Status:** ❌ Not started · **Effort:** M

**Governing decisions:** D7 (always-on redaction; disable-able; residual risk).

**Execution order:**
- **Step 1 (FS-20):** Redaction pass in `core/capture` — mask `[data-uat-redact]`, all inputs, and `options.redactSelectors[]` before PNG; blank redacted `textSnippet`. *(test-first against a DOM fixture)*
- **Step 2 (FS-21):** `captureScreenshots: false` deployment switch (metadata-only feedback).
- **Step 3 (FS-22):** Document residual risk + host responsibilities; add a host-integration checklist (note: add the appropriate safeguard before enabling screenshots in production).

**File checklist:** `packages/core/src/{capture.ts,redaction.ts}`, `packages/widget/src/index.ts` (options), `docs/DESIGN.md` (§Redaction), tests under `packages/core/test/`.

**Exit criteria:** marked regions + inputs are masked in a live capture; screenshots can be disabled per deployment; residual-risk + checklist documented.

---

## Deferred — parked decisions (post-v1 backlog)

| Item | Reason deferred | Revisit when |
|------|-----------------|--------------|
| B1 Postgres adapter | SQLite covers v1 self-host | First multi-tenant / HA deployment |
| B2 `Uat*` → `Situate*` rename | Keep extraction faithful + tests stable | After Sprint 5, as a dedicated rename PR |
| B3 Voting / roadmap board | Out of v1 scope (D8) | When feature-request volume warrants prioritisation UX |
| B4 Framework-agnostic widget | React covers current consumers | First non-React host asks to embed |
| B5 Notifications hook | Not needed for internal triage | When external submitters need status updates |
