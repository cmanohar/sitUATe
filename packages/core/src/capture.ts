import { UAT_ROOT_ATTR } from './constants.js';
import { applyRedaction, collectRedactionTargets, type RedactionOptions } from './redaction.js';

/**
 * Screenshot capture for the Situate overlay.
 *
 * `html-to-image` is used instead of `html2canvas` because modern design tokens
 * are often defined with `oklch()`, which html2canvas's CSS parser mis-renders.
 * The library is loaded via dynamic `import()` so it lives only in the overlay
 * chunk and is dead-code-eliminated when the overlay is disabled at build time.
 *
 * REDACTION (Sprint 5): always-on, best-effort masking runs before the PNG —
 * `[data-uat-redact]` regions, all form fields, and host `redactSelectors` are
 * covered, then the DOM is restored. See `redaction.ts` + DESIGN.md §Redaction.
 *
 * Not unit-tested: jsdom has no layout/paint engine. The redaction *logic* is
 * unit-tested (redaction.ts); the masked *paint* is verified live.
 */

/** Exclude the overlay's own DOM (toolbar, highlight) from captures. */
function notOverlay(node: HTMLElement): boolean {
  if (typeof node.closest !== 'function') return true;
  return !node.closest(`[${UAT_ROOT_ATTR}]`);
}

interface ToPngOptions {
  pixelRatio?: number;
  cacheBust?: boolean;
  filter?: (node: HTMLElement) => boolean;
}

async function toPng(node: HTMLElement, options: ToPngOptions): Promise<string> {
  const mod = (await import('html-to-image')) as {
    toPng: (n: HTMLElement, o: ToPngOptions) => Promise<string>;
  };
  return mod.toPng(node, options);
}

const dpr = (): number => window.devicePixelRatio || 1;

/** Capture just the selected element. Returns a PNG data URL, or undefined on failure. */
export async function captureElement(
  el: Element,
  options: RedactionOptions = {},
): Promise<string | undefined> {
  const restore = applyRedaction(collectRedactionTargets(el, options));
  try {
    return await toPng(el as HTMLElement, {
      pixelRatio: dpr(),
      cacheBust: true,
      filter: notOverlay,
    });
  } catch {
    return undefined;
  } finally {
    restore();
  }
}

/** Capture the whole page (for screen-scoped notes). Returns a PNG data URL, or undefined. */
export async function captureViewport(options: RedactionOptions = {}): Promise<string | undefined> {
  const restore = applyRedaction(collectRedactionTargets(document.documentElement, options));
  try {
    return await toPng(document.documentElement, {
      pixelRatio: dpr(),
      cacheBust: true,
      filter: notOverlay,
    });
  } catch {
    return undefined;
  } finally {
    restore();
  }
}
