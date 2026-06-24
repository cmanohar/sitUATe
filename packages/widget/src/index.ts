import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { UAT_ROOT_ATTR } from '@situate/core';
import { UatRoot } from './UatRoot.js';
import type { SituateConfig } from './gating.js';

/**
 * Mount the Situate overlay into a dedicated root appended to <body>.
 *
 * Gating is two-layered (Sprint 3):
 *
 *   1. Build-time (optional, for dead-code elimination of the overlay + deps):
 *        if (import.meta.env.VITE_SITUATE_ENABLED === 'true') situate(config);
 *   2. Runtime — `situate(config)` consults the collector on mount and renders
 *      only if the env is enabled and the user matches the allowlist. Fail-closed
 *      in non-dev; dev mode (no `collectorUrl`) stays on. See docs/DESIGN.md §Runtime gating.
 *
 *   situate({
 *     collectorUrl: 'https://collector.example.com',
 *     auth: { userId, roles, isAdmin },   // host-supplied identity
 *     environment: 'production',
 *   });
 *
 * Mounting is always safe: a denied decision renders nothing, so hosts may call
 * `situate()` unconditionally and let runtime gating decide.
 */
export function situate(config: SituateConfig = {}): void {
  if (document.querySelector(`[${UAT_ROOT_ATTR}]`)) return; // idempotent
  const host = document.createElement('div');
  host.setAttribute(UAT_ROOT_ATTR, '');
  document.body.appendChild(host);
  createRoot(host).render(createElement(UatRoot, { config }));
}

/** @deprecated Heritage alias for {@link situate}, kept for the original extraction. Prefer `situate()`. */
export const mountUat = situate;

export { UatRoot } from './UatRoot.js';
export { UatToolbar } from './UatToolbar.js';
export { ElementPicker } from './ElementPicker.js';
export { CommentPopover, type CommentDraft } from './CommentPopover.js';
export { useDraggable } from './useDraggable.js';
export { useUatSession } from './useUatSession.js';
export { useGating, resolveGating, userPasses, type SituateConfig, type GatingDecision } from './gating.js';
// Re-exported for hosts wiring identity into situate(config).
export type { SituateAuthContext } from '@situate/core';
