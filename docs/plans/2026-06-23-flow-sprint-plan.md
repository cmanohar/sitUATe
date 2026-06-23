# Flow — Sprint Plan

**Status:** Sprint 1 shipped (extraction); Sprints 2–5 planned · **Date:** 2026-06-23 · **Design:** [`../DESIGN.md`](../DESIGN.md)

Two-phase format per house convention: **Phase 1** sizes the backlog and picks sprint shape; **Phase 2** is the per-epic execution deep-dive. IDs: epics `F-EPIC-N`, stories `FS-N`. Effort scale: XS / S / M / L / XL.

---

## Phase 1 — Sprint Planning (backlog)

### Where we are

The overlay is **extracted and working** as a monorepo (`core` + `widget` + `server` + `admin` + `examples/vite-react`). 59 unit tests pass; the example host proves the widget mounts and styles itself with no host design tokens; `flow-report` renders markdown. Everything beyond extraction (backend, runtime gating, admin route, redaction hardening) is **designed but not built**.

### Candidate items

The backend is the **keystone**: runtime gating, the allowlist, the admin route, and triage all depend on it. Sequence around that.

| # | Item | Notes | Effort |
|---|------|-------|--------|
| **F1** | Extraction & standalone overlay | Monorepo, core/widget split, styling decoupling, example host, ported tests, CI. | **DONE** |
| **F2** | Collector backend (Fastify + StorageAdapter) | Ingest + flag/allowlist config + admin query APIs; files + SQLite adapters. | L |
| **F3** | Runtime gating + auth context | Widget resolves flag/allowlist via `FlowAuthContext`; fail-closed prod. | M |
| **F4** | Embeddable admin/triage route | Findings table, status/tags, export, flag+allowlist toggle (host auth, `isAdmin`). | L |
| **F5** | Redaction hardening | Always-on mask of `data-uat-redact` + inputs + configured selectors; disable-screenshots switch; residual-risk docs. | M |
| **F6** | Feature-request triage model | `FlowFindingStatus` lifecycle, category surfacing, CSV/markdown export. | S |
| **B1** | Postgres adapter | Production-grade store beyond SQLite. | M |
| **B2** | Internal `Uat*` → `Flow*` rename | Cosmetic; deferred to keep extraction faithful. | S |
| **B3** | Voting / roadmap board | Post-v1 product surface. | XL |
| **B4** | Framework-agnostic (non-React) widget | `core` is already React-free to enable this. | L |
| **B5** | Notifications hook (submitter status updates) | Email/webhook on status change. | M |

### Proposed sprint shape

- **Sprint 1 — Extraction (DONE):** F1.
- **Sprint 2 — Collector backend (keystone):** F2.
- **Sprint 3 — Runtime gating + auth:** F3.
- **Sprint 4 — Admin/triage route:** F4 + F6.
- **Sprint 5 — Redaction hardening:** F5.
- **Deferred (post-v1 backlog):** B1–B5.

### Decisions needed before kickoff

- [ ] Confirm Fastify (vs. keeping the dependency-free `http` collector) for F2 — DESIGN D9 recommends Fastify.
- [ ] Confirm default self-host store: SQLite for v1, Postgres deferred to B1.
- [ ] Confirm CI provider for the new repo (lint + build + test on PR).
- [ ] Confirm npm publish scope/visibility (`@cmanohar/*`, public or private registry).

---

## Phase 2 — Epic deep-dives

### F-EPIC-1 — Extraction & standalone overlay ✅ Implemented (2026-06-23)

**Outcome:** a reusable, embeddable overlay extracted from SerenityEMR, proven in a token-free host.

**Stories:** FS-1 monorepo scaffold · FS-2 core/widget split · FS-3 styling decoupling (preset + self-contained CSS, scoped `--tw-*`, no global leak) · FS-4 ported tests (59 green) · FS-5 example host + live verification · FS-6 report CLI.

**File checklist (shipped):**

| Area | Files |
|------|------|
| core | `packages/core/src/{types,constants,finding,selector,capture,location,transport,report}.ts`, `cli/report.ts`, `index.ts` |
| widget | `packages/widget/src/{UatRoot,UatToolbar,ElementPicker,CommentPopover}.tsx`, `{useDraggable,useUatSession}.ts`, `theme.css`, `flow-preset.cjs`, `index.ts` |
| server | `packages/server/src/{vite-plugin.ts,collector.mjs,index.ts}` |
| admin | `packages/admin/src/index.ts` (contracts only) |
| example | `examples/vite-react/{src,vite.config.ts,index.html}` |

---

### F-EPIC-2 — Collector backend (keystone)

**Parent sprint:** Sprint 2 · **Status:** ❌ Not started · **Effort:** L

**Governing decisions:** D3 (pluggable storage), D9 (Fastify). The Vite dev plugin stays the local sink; this epic adds the deployable service.

**Execution order:**
- **Step 0 — Entry gate:** `npm test` green; example host runs.
- **Step 1 (FS-7):** Define `StorageAdapter` (DESIGN §interfaces) in `core`; unit-test against an in-memory fake. *(test-first)*
- **Step 2 (FS-8):** `FilesAdapter` (parity with current JSONL+shots layout) + `SqliteAdapter`.
- **Step 3 (FS-9):** Fastify service exposing `POST /uat/feedback` (ingest), `GET/PUT /config/:env` (flag+allowlist), `GET /findings` (admin query) — preserving the existing ingest contract.
- **Step 4 (FS-10):** Screenshot storage via `saveScreenshot` (server-generated names); 25 MB cap; CORS + ingest-token parity with `collector.mjs`.
- **Step 5 (FS-11):** Docker image + `flow-collector` bin; healthcheck; config via env.

**File checklist:** `packages/server/src/{server.ts,adapters/{files,sqlite}.ts,routes/*.ts}`, `packages/core/src/storage.ts`, tests under `packages/server/test/`.

**Exit criteria:** ingest persists via SQLite; config API round-trips a `FlowGatingConfig`; `flow-report` reads the same data; adapter tests green.

---

### F-EPIC-3 — Runtime gating + auth context

**Parent sprint:** Sprint 3 · **Status:** ❌ Not started · **Effort:** M

**Governing decisions:** D5 (flag + allowlist, fail-closed), D6 (host-supplied `FlowAuthContext`).

**Execution order:**
- **Step 1 (FS-12):** `mountFlow(config)` accepts `{ collectorUrl, auth: FlowAuthContext, environment }`; thread through `useUatSession`.
- **Step 2 (FS-13):** On mount, resolve gating from the collector; render only if `enabled` && role/id match. *(test-first: gating-resolution unit tests)*
- **Step 3 (FS-14):** **Fail-closed** in non-dev environments (error/missing config/no collector → no overlay); dev mode stays on.
- **Step 4 (FS-15):** Replace the build-time `VITE_FLOW_ENABLED`-only path with build-flag-OR-runtime-gate; document the migration.

**File checklist:** `packages/widget/src/{index.ts,useUatSession.ts,gating.ts}`, `packages/core/src/transport.ts`, tests under `packages/widget/test/`.

**Exit criteria:** widget renders for an allowlisted user and hides for a non-allowlisted one against a live collector; fail-closed verified.

---

### F-EPIC-4 — Embeddable admin/triage route

**Parent sprint:** Sprint 4 · **Status:** ❌ Not started · **Effort:** L (with FS-6)

**Governing decisions:** D4 (embeddable, host auth), D8 (capture + triage).

**Execution order:**
- **Step 1 (FS-16):** `<FlowAdmin auth={FlowAuthContext} collectorUrl=… />` — gated on `isAdmin`; reusability gate first (extract a `FindingsTable` primitive + a `useFindings` hook before feature views). *(test-first)*
- **Step 2 (FS-17):** Triage actions — set `FlowFindingStatus`, tags, filter by severity/category/status.
- **Step 3 (FS-18):** Gating editor — toggle `enabled`, edit `allowedRoles`/`allowedUserIds` (writes config API).
- **Step 4 (FS-19, = FS-F6):** Export (CSV + markdown via `renderReport`); screenshot viewing by server filename.

**File checklist:** `packages/admin/src/{FlowAdmin.tsx,FindingsTable.tsx,GatingEditor.tsx,useFindings.ts,index.ts}`, tests under `packages/admin/test/`.

**Exit criteria:** an admin mounts the route in a host, reviews findings, sets statuses, flips the runtime flag, and exports — all via the collector API; non-admins are blocked.

---

### F-EPIC-5 — Redaction hardening

**Parent sprint:** Sprint 5 · **Status:** ❌ Not started · **Effort:** M

**Governing decisions:** D7 (always-on redaction; disable-able; residual risk).

**Execution order:**
- **Step 1 (FS-20):** Redaction pass in `core/capture` — mask `[data-uat-redact]`, all inputs, and `options.redactSelectors[]` before PNG; blank redacted `textSnippet`. *(test-first against a DOM fixture)*
- **Step 2 (FS-21):** `captureScreenshots: false` deployment switch (metadata-only feedback).
- **Step 3 (FS-22):** Document residual risk + host responsibilities; add a host-integration checklist (EHR note: hazard-log entry required before enabling screenshots in clinical prod).

**File checklist:** `packages/core/src/{capture.ts,redaction.ts}`, `packages/widget/src/index.ts` (options), `docs/DESIGN.md` (§PHI), tests under `packages/core/test/`.

**Exit criteria:** marked regions + inputs are masked in a live capture; screenshots can be disabled per deployment; residual-risk + checklist documented.

---

## Deferred — parked decisions (post-v1 backlog)

| Item | Reason deferred | Revisit when |
|------|-----------------|--------------|
| B1 Postgres adapter | SQLite covers v1 self-host | First multi-tenant / HA deployment |
| B2 `Uat*` → `Flow*` rename | Keep extraction faithful + tests stable | After Sprint 5, as a dedicated rename PR |
| B3 Voting / roadmap board | Out of v1 scope (D8) | When feature-request volume warrants prioritisation UX |
| B4 Framework-agnostic widget | React covers current consumers | First non-React host asks to embed |
| B5 Notifications hook | Not needed for internal triage | When external submitters need status updates |
