/**
 * Situate gating + triage contracts.
 *
 * These shapes are shared across surfaces: the widget reads `SituateAuthContext`
 * and the resolved `SituateGatingConfig` to decide whether to render (Sprint 3);
 * the collector persists/serves the config and a finding's `SituateFindingStatus`
 * (Sprint 2); the admin route edits both (Sprint 4).
 *
 * They live in `core` — not `admin` — because `StorageAdapter` (also in core)
 * references them and `core` must never import from `admin` (one-way dependency).
 * `@situate/admin` re-exports them so its published contract is unchanged.
 */

/** Host-supplied identity. Situate never owns auth (D6). */
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

/** Runtime gating config served by the collector and edited in the admin route (D5). */
export interface SituateGatingConfig {
  /** Master on/off for this environment. */
  enabled: boolean;
  /** Roles permitted to see the widget when enabled (empty = all authenticated). */
  allowedRoles: string[];
  /** Explicit user allowlist, in addition to roles. */
  allowedUserIds: string[];
}

/**
 * Fail-closed default returned for an environment that has no config stored.
 * S3 gating relies on this: absent config ⇒ overlay off in non-dev environments.
 */
export const DEFAULT_GATING_CONFIG: SituateGatingConfig = {
  enabled: false,
  allowedRoles: [],
  allowedUserIds: [],
};
