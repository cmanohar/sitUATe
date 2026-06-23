import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveEndpoint,
  submitFinding,
  flushQueue,
  readQueue,
  queueSize,
} from '../src/transport';
import { buildFinding } from '../src/finding';
import type { BuildFindingInput } from '../src/types';

const draft: BuildFindingInput = {
  sessionId: 'sess-1',
  environment: 'local',
  scope: 'screen',
  route: '/dashboard',
  url: 'http://localhost:5174/dashboard',
  viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
  severity: 'Medium',
  comment: 'note',
  userAgent: 'vitest',
};
const makeFinding = () => buildFinding(draft);

function okResponse(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as Response;
}
function errResponse(status = 500) {
  return { ok: false, status, json: async () => ({}) } as Response;
}

beforeEach(() => {
  localStorage.clear();
});

describe('resolveEndpoint', () => {
  it('uses the local dev endpoint when no collector URL is set', () => {
    expect(resolveEndpoint(undefined)).toBe('/__uat/feedback');
    expect(resolveEndpoint('')).toBe('/__uat/feedback');
  });

  it('targets the collector when a URL is set, tolerating a trailing slash', () => {
    expect(resolveEndpoint('https://c.example.com')).toBe('https://c.example.com/uat/feedback');
    expect(resolveEndpoint('https://c.example.com/')).toBe('https://c.example.com/uat/feedback');
  });
});

describe('submitFinding', () => {
  it('POSTs to the resolved endpoint and returns the server screenshotFile', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ screenshotFile: 'shot-1.png' }));
    const res = await submitFinding(makeFinding(), 'data:image/png;base64,AAAA', {
      collectorUrl: 'https://c.example.com',
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    expect(res.screenshotFile).toBe('shot-1.png');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://c.example.com/uat/feedback');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      pngBase64: 'data:image/png;base64,AAAA',
    });
  });

  it('queues the finding WITHOUT the png when the POST returns non-ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errResponse(500));
    const res = await submitFinding(makeFinding(), 'data:image/png;base64,AAAA', { fetchImpl });
    expect(res.ok).toBe(false);
    expect(queueSize()).toBe(1);
    expect(JSON.stringify(readQueue())).not.toContain('base64');
  });

  it('queues on network rejection', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await submitFinding(makeFinding(), undefined, { fetchImpl });
    expect(queueSize()).toBe(1);
  });
});

describe('flushQueue', () => {
  it('re-sends queued findings and clears the ones that succeed', async () => {
    const failing = vi.fn().mockResolvedValue(errResponse(500));
    await submitFinding(makeFinding(), undefined, { fetchImpl: failing });
    await submitFinding(makeFinding(), undefined, { fetchImpl: failing });
    expect(queueSize()).toBe(2);

    const ok = vi.fn().mockResolvedValue(okResponse());
    const flushed = await flushQueue({ fetchImpl: ok });
    expect(flushed).toBe(2);
    expect(queueSize()).toBe(0);
  });

  it('keeps still-failing findings without duplicating them', async () => {
    const failing = vi.fn().mockResolvedValue(errResponse(500));
    await submitFinding(makeFinding(), undefined, { fetchImpl: failing });
    expect(queueSize()).toBe(1);

    const stillFailing = vi.fn().mockResolvedValue(errResponse(500));
    const flushed = await flushQueue({ fetchImpl: stillFailing });
    expect(flushed).toBe(0);
    expect(queueSize()).toBe(1);
  });
});
