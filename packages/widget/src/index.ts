import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { UAT_ROOT_ATTR } from '@situate/core';
import { UatRoot } from './UatRoot.js';

/**
 * Mount the Situate overlay into a dedicated root appended to <body>.
 *
 * Call behind a build-time flag so the overlay + its deps are dead-code
 * eliminated when disabled:
 *
 *   import { situate } from '@situate/widget';
 *   import '@situate/widget/styles.css';
 *   if (import.meta.env.VITE_SITUATE_ENABLED === 'true') situate();
 *
 * Runtime gating (remote flag + role allowlist) lands in a later sprint — see
 * docs/DESIGN.md §Runtime gating.
 */
export function situate(): void {
  if (document.querySelector(`[${UAT_ROOT_ATTR}]`)) return; // idempotent
  const host = document.createElement('div');
  host.setAttribute(UAT_ROOT_ATTR, '');
  document.body.appendChild(host);
  createRoot(host).render(createElement(UatRoot));
}

/** @deprecated Heritage alias for {@link situate}, kept for the original extraction. Prefer `situate()`. */
export const mountUat = situate;

export { UatRoot } from './UatRoot.js';
export { UatToolbar } from './UatToolbar.js';
export { ElementPicker } from './ElementPicker.js';
export { CommentPopover, type CommentDraft } from './CommentPopover.js';
export { useDraggable } from './useDraggable.js';
export { useUatSession } from './useUatSession.js';
