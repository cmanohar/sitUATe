import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { UAT_ROOT_ATTR } from '@cmanohar/flow-core';
import { UatRoot } from './UatRoot.js';

/**
 * Mount the Flow overlay into a dedicated root appended to <body>.
 *
 * Call behind a build-time flag so the overlay + its deps are dead-code
 * eliminated when disabled:
 *
 *   import { mountFlow } from '@cmanohar/flow-feedback';
 *   import '@cmanohar/flow-feedback/styles.css';
 *   if (import.meta.env.VITE_FLOW_ENABLED === 'true') mountFlow();
 *
 * Runtime gating (remote flag + role allowlist) lands in a later sprint — see
 * docs/DESIGN.md §Runtime gating.
 */
export function mountFlow(): void {
  if (document.querySelector(`[${UAT_ROOT_ATTR}]`)) return; // idempotent
  const host = document.createElement('div');
  host.setAttribute(UAT_ROOT_ATTR, '');
  document.body.appendChild(host);
  createRoot(host).render(createElement(UatRoot));
}

/** @deprecated Heritage alias for {@link mountFlow}; will be removed when internals are renamed. */
export const mountUat = mountFlow;

export { UatRoot } from './UatRoot.js';
export { UatToolbar } from './UatToolbar.js';
export { ElementPicker } from './ElementPicker.js';
export { CommentPopover, type CommentDraft } from './CommentPopover.js';
export { useDraggable } from './useDraggable.js';
export { useUatSession } from './useUatSession.js';
