import { describe, it, expect } from 'vitest';
import { buildFinding } from '../src/finding';
import type { BuildFindingInput } from '../src/types';

const base: BuildFindingInput = {
  sessionId: 'sess-1',
  environment: 'local',
  scope: 'element',
  route: '/patients/abc',
  url: 'http://localhost:5174/patients/abc',
  viewport: { width: 1280, height: 800, devicePixelRatio: 2 },
  severity: 'High',
  comment: 'Save button overlaps the header',
  selector: { cssPath: 'main > button:nth-of-type(1)', tagName: 'button', testId: 'save' },
  boundingBox: { x: 10, y: 20, width: 100, height: 40 },
  category: 'bug',
  testerRole: 'internal',
  userAgent: 'vitest',
};

describe('buildFinding', () => {
  it('generates a uuid id, schemaVersion 1, and an ISO 8601 timestamp', () => {
    const f = buildFinding(base);
    expect(f.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(f.schemaVersion).toBe(1);
    expect(f.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
  });

  it('carries the input fields through unchanged', () => {
    const f = buildFinding(base);
    expect(f.sessionId).toBe('sess-1');
    expect(f.route).toBe('/patients/abc');
    expect(f.severity).toBe('High');
    expect(f.category).toBe('bug');
    expect(f.testerRole).toBe('internal');
    expect(f.selector?.testId).toBe('save');
    expect(f.boundingBox?.width).toBe(100);
  });

  it('supports a screen-scoped finding with no selector or bounding box', () => {
    const f = buildFinding({
      ...base,
      scope: 'screen',
      environment: 'clone',
      selector: undefined,
      boundingBox: undefined,
    });
    expect(f.scope).toBe('screen');
    expect(f.environment).toBe('clone');
    expect(f.selector).toBeUndefined();
    expect(f.boundingBox).toBeUndefined();
  });

  it('trims surrounding whitespace from the comment', () => {
    const f = buildFinding({ ...base, comment: '   spacey note   ' });
    expect(f.comment).toBe('spacey note');
  });

  it('generates a unique id on every call', () => {
    const a = buildFinding(base);
    const b = buildFinding(base);
    expect(a.id).not.toBe(b.id);
  });

  it('does not set screenshotFile (assigned later by the transport/collector)', () => {
    expect(buildFinding(base).screenshotFile).toBeUndefined();
  });
});
