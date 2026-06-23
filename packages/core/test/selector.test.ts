import { describe, it, expect } from 'vitest';
import {
  computeSelectorPath,
  extractElementMeta,
  getBoundingBox,
} from '../src/selector';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('computeSelectorPath', () => {
  it('returns a path that re-selects the same node', () => {
    setBody(`
      <main>
        <section><button>One</button><button>Two</button></section>
        <section><button>Three</button></section>
      </main>
    `);
    const target = document.querySelectorAll('button')[1]; // "Two"
    const path = computeSelectorPath(target);
    expect(document.querySelector(path)).toBe(target);
  });

  it('anchors on a unique id and re-selects that node', () => {
    setBody(`<div><p>a</p><span id="uniq">x</span></div>`);
    const el = document.getElementById('uniq')!;
    const path = computeSelectorPath(el);
    expect(path).toContain('#uniq');
    expect(document.querySelector(path)).toBe(el);
  });
});

describe('extractElementMeta', () => {
  it('captures testId, aria-label, role, tag, and collapsed text', () => {
    setBody(
      `<button data-testid="save-btn" aria-label="Save note" role="button">Save  <span>note</span></button>`,
    );
    const el = document.querySelector('button')!;
    const meta = extractElementMeta(el);
    expect(meta.testId).toBe('save-btn');
    expect(meta.ariaLabel).toBe('Save note');
    expect(meta.role).toBe('button');
    expect(meta.tagName).toBe('button');
    expect(meta.textSnippet).toBe('Save note');
    expect(meta.cssPath).toBeTruthy();
  });

  it('finds the nearest ancestor testId when the target lacks one', () => {
    setBody(`<div data-testid="card"><p><a href="#">link</a></p></div>`);
    const el = document.querySelector('a')!;
    expect(extractElementMeta(el).testId).toBe('card');
  });

  it('truncates long text to 120 characters', () => {
    setBody(`<p>${'x'.repeat(300)}</p>`);
    const meta = extractElementMeta(document.querySelector('p')!);
    expect(meta.textSnippet!.length).toBeLessThanOrEqual(120);
  });

  it('omits textSnippet when the element has no visible text', () => {
    setBody(`<div></div>`);
    expect(extractElementMeta(document.querySelector('div')!).textSnippet).toBeUndefined();
  });
});

describe('getBoundingBox', () => {
  it('returns a numeric {x,y,width,height} shape', () => {
    setBody(`<div></div>`);
    const box = getBoundingBox(document.querySelector('div')!);
    expect(box).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });
});
