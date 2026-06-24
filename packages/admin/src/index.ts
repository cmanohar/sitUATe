/**
 * @situate/admin — embeddable admin/triage route for Situate (Sprint 4).
 *
 * React components a host mounts behind its own routing (e.g. `/admin/feedback`):
 *   - `SituateAdmin` — the triage route: findings table (filter, set status, view
 *     screenshots, export CSV/markdown) + the runtime gating editor.
 *   - `FindingsTable`, `GatingEditor` — reusable primitives.
 *   - `useFindings` + the `client`/`export` helpers — for custom admin surfaces.
 *
 * The host supplies identity via `SituateAuthContext` (NO identity provider is
 * baked in — see docs/DESIGN.md §Auth). The route renders only for `isAdmin`, and
 * the collector enforces the admin token server-side.
 */

// Gating/triage contracts live in `@situate/core` (so the collector's StorageAdapter
// can reference them without core→admin coupling); re-exported here unchanged.
export type {
  SituateAuthContext,
  SituateFindingStatus,
  SituateGatingConfig,
} from '@situate/core';

export { SituateAdmin, type SituateAdminProps } from './SituateAdmin.js';
export { FindingsTable, STATUSES, type FindingsTableProps } from './FindingsTable.js';
export { GatingEditor, type GatingEditorProps } from './GatingEditor.js';
export { useFindings, type UseFindings } from './useFindings.js';
export {
  listFindings,
  setStatus,
  getConfig,
  setConfig,
  fetchScreenshot,
  type AdminClientOptions,
} from './client.js';
export { findingsToCsv, findingsToMarkdown, downloadText } from './export.js';
