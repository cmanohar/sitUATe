/**
 * Always-on screenshot redaction (D7).
 *
 * Best-effort masking applied before a PNG is produced: explicitly marked regions
 * (`[data-uat-redact]`), every form field that could hold typed data, and any
 * host-configured `redactSelectors`. The captured text snippet is also blanked for
 * redacted elements. This is NOT a guarantee that zero sensitive data reaches a
 * screenshot — see DESIGN.md §Redaction for residual risk and host responsibilities.
 *
 * The pure helpers (selector/target/`isRedacted`) are unit-tested; the live DOM
 * masking is paint-verified in the example host (jsdom has no layout engine).
 */

export interface RedactionOptions {
  /** Extra CSS selectors to mask, in addition to the always-on set. */
  redactSelectors?: string[];
}

/** Always masked: marked regions + any field that could hold typed/selected data. */
const ALWAYS_REDACT = [
  '[data-uat-redact]',
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit])',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
];

export function redactionSelector(options: RedactionOptions = {}): string {
  return [...ALWAYS_REDACT, ...(options.redactSelectors ?? [])].join(',');
}

/** Is this element, or an ancestor, inside a redacted region? */
export function isRedacted(el: Element, options: RedactionOptions = {}): boolean {
  return typeof el.closest === 'function' && el.closest(redactionSelector(options)) !== null;
}

/** Every redaction target under (and including) `root`. */
export function collectRedactionTargets(root: Element, options: RedactionOptions = {}): Element[] {
  const sel = redactionSelector(options);
  const found = new Set<Element>();
  if (typeof root.matches === 'function' && root.matches(sel)) found.add(root);
  root.querySelectorAll?.(sel).forEach((e) => found.add(e));
  return [...found];
}

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Mask each target in the live DOM, returning a restore fn (call after capture).
 * Form controls can't host children, so they're masked with a solid background +
 * transparent text; everything else gets a solid cover overlay so descendant
 * images/text don't reach the raster. Reverts the DOM exactly on restore.
 */
export function applyRedaction(targets: Element[]): () => void {
  const undo: (() => void)[] = [];

  for (const el of targets) {
    const h = el as HTMLElement;

    if (FIELD_TAGS.has(h.tagName)) {
      const prev = h.getAttribute('style');
      h.style.setProperty('color', 'transparent', 'important');
      h.style.setProperty('background-color', '#111827', 'important');
      h.style.setProperty('text-shadow', 'none', 'important');
      undo.push(() => (prev === null ? h.removeAttribute('style') : h.setAttribute('style', prev)));
      continue;
    }

    const prevPosition = h.style.position;
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(h).position : '';
    if (!prevPosition && computed === 'static') h.style.position = 'relative';

    const cover = h.ownerDocument.createElement('div');
    cover.setAttribute('data-uat-mask', '');
    cover.style.cssText =
      'position:absolute;inset:0;background:#111827;border-radius:inherit;pointer-events:none;';
    h.appendChild(cover);

    undo.push(() => {
      cover.remove();
      h.style.position = prevPosition;
    });
  }

  return () => undo.forEach((u) => u());
}
