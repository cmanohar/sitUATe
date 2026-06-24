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

/** Host-supplied identity. Situate never owns auth. */
export interface SituateAuthContext {
  userId: string;
  displayName?: string;
  roles: string[];
  isAdmin: boolean;
}

/** Triage lifecycle for a finding / feature request. */
export type SituateFindingStatus =
  | 'new'
  | 'triaged'
  | 'planned'
  | 'in-progress'
  | 'shipped'
  | 'declined'
  | 'duplicate';

/** Runtime gating config served by the collector and edited in the admin route. */
export interface SituateGatingConfig {
  /** Master on/off for this environment. */
  enabled: boolean;
  /** Roles permitted to see the widget when enabled (empty = all authenticated). */
  allowedRoles: string[];
  /** Explicit user allowlist, in addition to roles. */
  allowedUserIds: string[];
}

/** Placeholder until the components land in Sprint 4. */
export const SITUATE_ADMIN_STATUS = 'planned' as const;
