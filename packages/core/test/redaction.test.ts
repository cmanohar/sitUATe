import { describe, it, expect, beforeEach } from 'vitest';
import {
  redactionSelector,
  isRedacted,
  collectRedactionTargets,
  applyRedaction,
} from '../src/redaction';

function setBody(html: string) {
  document.body.innerHTML = html;
}

beforeEach(() => setBody(''));

describe('redactionSelector', () => {
  it('always includes marked regions and form fields', () => {
    const sel = redactionSelector();
    expect(sel).toContain('[data-uat-redact]');
    expect(sel).toContain('textarea');
    expect(sel).toContain('select');
  });

  it('appends host-configured selectors', () => {
    expect(redactionSelector({ redactSelectors: ['.ssn', '#pii'] })).toContain('.ssn,#pii');
  });
});

describe('collectRedactionTargets', () => {
  it('finds marked regions, inputs, textareas, selects, and configured selectors', () => {
    setBody(`
      <section data-uat-redact><p>secret</p></section>
      <input value="x" />
      <input type="checkbox" />
      <textarea></textarea>
      <select><option>a</option></select>
      <div class="ssn">123-45-6789</div>
      <p>safe</p>
    `);
    const targets = collectRedactionTargets(document.body, { redactSelectors: ['.ssn'] });
    const tags = targets.map((t) => t.tagName.toLowerCase()).sort();
    expect(tags).toEqual(['div', 'input', 'section', 'select', 'textarea']);
    // checkbox is excluded (no typed data), the bare <p>safe</p> is not a target
    expect(targets.some((t) => (t as HTMLInputElement).type === 'checkbox')).toBe(false);
  });

  it('includes the root itself when it matches', () => {
    setBody(`<div id="r" data-uat-redact><span>x</span></div>`);
    const root = document.getElementById('r')!;
    expect(collectRedactionTargets(root).some((t) => t === root)).toBe(true);
  });
});

describe('isRedacted', () => {
  it('is true for an element inside a marked region', () => {
    setBody(`<section data-uat-redact><b id="t">hi</b></section>`);
    expect(isRedacted(document.getElementById('t')!)).toBe(true);
  });

  it('is false for an element outside any redacted region', () => {
    setBody(`<p id="t">hi</p>`);
    expect(isRedacted(document.getElementById('t')!)).toBe(false);
  });
});

describe('applyRedaction / restore', () => {
  it('covers non-field targets with an overlay and reverts cleanly', () => {
    setBody(`<section id="s" data-uat-redact><img src="x" /></section>`);
    const s = document.getElementById('s')!;
    const restore = applyRedaction([s]);
    expect(s.querySelector('[data-uat-mask]')).not.toBeNull();
    restore();
    expect(s.querySelector('[data-uat-mask]')).toBeNull();
    expect(s.getAttribute('style')).toBeFalsy(); // position override reverted
  });

  it('masks form fields with inline style and restores original style', () => {
    setBody(`<input id="i" style="color: red" value="secret" />`);
    const i = document.getElementById('i')!;
    const restore = applyRedaction([i]);
    expect(i.style.getPropertyValue('color')).toBe('transparent');
    // jsdom normalizes the hex to rgb()
    expect(i.style.getPropertyValue('background-color')).toBe('rgb(17, 24, 39)');
    restore();
    expect(i.getAttribute('style')).toBe('color: red'); // exact original preserved
  });
});
