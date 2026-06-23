import { describe, it, expect } from 'vitest';
import { renderReport } from '../src/report';
import type { UatFinding } from '../src/types';

function finding(over: Partial<UatFinding>): UatFinding {
  return {
    id: 'id',
    schemaVersion: 1,
    timestamp: '2026-06-20T10:00:00.000Z',
    sessionId: 's1',
    environment: 'local',
    scope: 'element',
    route: '/dashboard',
    url: 'http://localhost:5174/dashboard',
    viewport: { width: 1280, height: 800, devicePixelRatio: 2 },
    severity: 'Medium',
    comment: 'something',
    userAgent: 'test',
    ...over,
  };
}

const findings: UatFinding[] = [
  finding({
    severity: 'Critical',
    route: '/patients/a',
    comment: 'Allergy banner missing on chart load',
    category: 'bug',
    sessionId: 's1',
    selector: { cssPath: 'main > div:nth-of-type(1)', testId: 'allergy-banner', tagName: 'div' },
    screenshotFile: 'shot-1.png',
  }),
  finding({
    severity: 'High',
    route: '/dashboard',
    comment: 'Schedule cards overlap the header | column',
    category: 'change',
    sessionId: 's1',
  }),
  finding({
    severity: 'Critical',
    route: '/messages',
    comment: 'Triage queue crashes when empty',
    category: 'bug',
    sessionId: 's2',
    testerRole: 'hcp',
  }),
];

describe('renderReport', () => {
  const md = renderReport(findings, { date: '2026-06-20', source: 'local' });

  it('emits the exact repo summary table header', () => {
    expect(md).toContain(
      '| Area | Finding | Severity | Evidence/Quote | Proposed Action | Owner |',
    );
  });

  it('orders severity sections Critical → High and omits empty groups', () => {
    expect(md.indexOf('## CRITICAL')).toBeGreaterThanOrEqual(0);
    expect(md.indexOf('## CRITICAL')).toBeLessThan(md.indexOf('## HIGH'));
    expect(md).not.toContain('## MEDIUM');
    expect(md).not.toContain('## LOW');
  });

  it('numbers findings per severity group', () => {
    expect(md).toContain('### C-1');
    expect(md).toContain('### C-2');
    expect(md).toContain('### H-1');
  });

  it('includes a Repro / AI-fix context block with selector + route', () => {
    expect(md).toContain('Repro / AI-fix context');
    expect(md).toContain('cssPath: main > div:nth-of-type(1)');
    expect(md).toContain('route: /patients/a');
    expect(md).toContain('testId: allergy-banner');
  });

  it('escapes pipe characters in the summary table cells', () => {
    const summary = md.split('## CRITICAL')[0];
    expect(summary).toContain('overlap the header \\| column');
  });

  it('reports session count and total in the header', () => {
    expect(md).toMatch(/3 finding/);
    expect(md).toMatch(/2 session/);
  });

  it('renders a placeholder when there are no findings', () => {
    const empty = renderReport([], { date: '2026-06-20' });
    expect(empty).toContain('No findings');
  });
});
