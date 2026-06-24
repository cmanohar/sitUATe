import type { BoundingBox, SelectorInfo } from './types.js';
import { isRedacted, type RedactionOptions } from './redaction.js';

const MAX_DEPTH = 6;
const MAX_TEXT = 120;

function cssEscape(value: string): string {
  const fn = globalThis.CSS?.escape;
  return fn ? fn(value) : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function isUniqueId(id: string): boolean {
  try {
    return document.querySelectorAll(`#${cssEscape(id)}`).length === 1;
  } catch {
    return false;
  }
}

function nthOfType(el: Element): number {
  let n = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName === el.tagName) n++;
    sib = sib.previousElementSibling;
  }
  return n;
}

/**
 * Best-effort, DOM-only CSS selector path. Walks up to {@link MAX_DEPTH}
 * ancestors, short-circuiting on the first unique `#id`, otherwise using
 * `tag:nth-of-type(n)` segments. Not guaranteed unique — pair with
 * `data-testid`/text for stronger identity (see {@link extractElementMeta}).
 */
export function computeSelectorPath(el: Element, maxDepth = MAX_DEPTH): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (
    node &&
    node.nodeType === 1 &&
    node !== document.documentElement &&
    depth < maxDepth
  ) {
    if (node.id && isUniqueId(node.id)) {
      parts.unshift(`#${cssEscape(node.id)}`);
      return parts.join(' > ');
    }
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${nthOfType(node)})`);
    node = node.parentElement;
    depth++;
  }

  return parts.join(' > ');
}

/** Collapse and trim an element's visible text to a short snippet. */
function textSnippet(el: Element): string | undefined {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, MAX_TEXT) : undefined;
}

function nearestAttr(el: Element, selector: string, attr: string): string | undefined {
  return el.closest(selector)?.getAttribute(attr) ?? undefined;
}

/**
 * DOM-only identity for a selected element. No React-internals coupling.
 * `textSnippet` is blanked when the element is within a redacted region so visible
 * text from a masked area never travels in the finding metadata (D7).
 */
export function extractElementMeta(el: Element, options: RedactionOptions = {}): SelectorInfo {
  return {
    cssPath: computeSelectorPath(el),
    testId: nearestAttr(el, '[data-testid]', 'data-testid'),
    ariaLabel: nearestAttr(el, '[aria-label]', 'aria-label'),
    role: nearestAttr(el, '[role]', 'role'),
    textSnippet: isRedacted(el, options) ? undefined : textSnippet(el),
    tagName: el.tagName.toLowerCase(),
  };
}

export function getBoundingBox(el: Element): BoundingBox {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
