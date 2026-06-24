import { describe, it, expect } from 'vitest';
import type { UatFinding } from '@situate/core';
import { findingsToCsv, findingsToMarkdown } from '../src/export.js';

const finding = (over: Partial<UatFinding> = {}): UatFinding => ({
  id: 'f1',
  schemaVersion: 1,
  timestamp: '2026-06-24T10:00:00.000Z',
  sessionId: 's1',
  environment: 'clone',
  scope: 'screen',
  route: '/dash',
  url: 'https://h/dash',
  viewport: { width: 1, height: 1, devicePixelRatio: 1 },
  severity: 'High',
  comment: 'a finding',
  userAgent: 'x',
  status: 'new',
  ...over,
});

describe('findingsToCsv', () => {
  it('emits a header and one row per finding', () => {
    const csv = findingsToCsv([finding(), finding({ id: 'f2' })]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('id,timestamp,status,severity,category,route,comment,testerRole,screenshotFile');
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith('f1,')).toBe(true);
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = findingsToCsv([finding({ comment: 'has, comma and "quote"' })]);
    expect(csv).toContain('"has, comma and ""quote"""');
  });
});

describe('findingsToMarkdown', () => {
  it('delegates to the core report renderer', () => {
    const md = findingsToMarkdown([finding({ comment: 'render me' })], '2026-06-24');
    expect(md).toContain('# UAT Findings — 2026-06-24');
    expect(md).toContain('render me');
  });
});
