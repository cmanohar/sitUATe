/**
 * @situate/admin — embeddable admin/triage route for Situate.  [Sprint 4 — stub]
 *
 * Will export React components a host mounts at e.g. `/admin/feedback`:
 *   - a findings/feature-request triage table (filter, tag, set status, export)
 *   - the runtime flag + role-allowlist toggle (writes to the collector's config API)
 *
 * The host supplies identity via an AuthContext (NO identity provider is baked
 * in — see docs/DESIGN.md §Auth). The shapes below are the contract those
 * components will consume; they are published now so the design has a concrete,
 * type-checked anchor.
 */

/**
 * The gating/triage contracts now live in `@situate/core` (so the collector's
 * `StorageAdapter` can reference them without `core` importing `admin`). Re-exported
 * here unchanged so this package's published contract is stable.
 */
export type {
  SituateAuthContext,
  SituateFindingStatus,
  SituateGatingConfig,
} from '@situate/core';

/** Placeholder until the components land in Sprint 4. */
export const SITUATE_ADMIN_STATUS = 'planned' as const;
