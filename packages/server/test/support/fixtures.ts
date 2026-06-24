import type { UatFinding } from '@situate/core';

let seq = 0;

/** Build a complete `UatFinding` for tests; override any field. */
export function makeFinding(overrides: Partial<UatFinding> = {}): UatFinding {
  seq += 1;
  return {
    id: `finding-${seq}`,
    schemaVersion: 1,
    timestamp: '2026-06-24T12:00:00.000Z',
    sessionId: 'sess-1',
    environment: 'clone',
    scope: 'element',
    route: '/dashboard',
    url: 'https://app.example.com/dashboard',
    viewport: { width: 1280, height: 800, devicePixelRatio: 2 },
    severity: 'Medium',
    comment: 'something looks off',
    userAgent: 'test-agent',
    ...overrides,
  };
}

/** A tiny valid 1×1 PNG buffer for screenshot tests. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
