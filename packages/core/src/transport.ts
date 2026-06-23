import type { UatFinding } from './types.js';

/** Local dev fallback endpoint, served by the Vite plugin (packages/server). */
export const LOCAL_ENDPOINT = '/__uat/feedback';

const QUEUE_KEY = 'uat:queue';

export interface TransportConfig {
  /** Remote collector base URL (staging/clone). Empty/undefined → local dev. */
  collectorUrl?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export interface SubmitResult {
  ok: boolean;
  screenshotFile?: string;
  queued?: boolean;
}

export function resolveEndpoint(collectorUrl?: string): string {
  if (!collectorUrl) return LOCAL_ENDPOINT;
  return `${collectorUrl.replace(/\/+$/, '')}/uat/feedback`;
}

/** Raw POST with no side effects. Returns ok=false on any error (never throws). */
async function postFinding(
  finding: UatFinding,
  pngBase64: string | undefined,
  config: TransportConfig,
): Promise<SubmitResult> {
  const doFetch = config.fetchImpl ?? globalThis.fetch;
  try {
    const res = await doFetch(resolveEndpoint(config.collectorUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finding, pngBase64 }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json().catch(() => ({}))) as { screenshotFile?: string };
    return { ok: true, screenshotFile: data.screenshotFile };
  } catch {
    return { ok: false };
  }
}

// ── Offline retry queue (metadata only — never base64 PNGs) ──────────────────

export function readQueue(): UatFinding[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as UatFinding[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: UatFinding[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full / unavailable — best-effort only */
  }
}

export function queueSize(): number {
  return readQueue().length;
}

function enqueue(finding: UatFinding): void {
  const queue = readQueue();
  queue.push(finding);
  writeQueue(queue);
}

/**
 * Submit a finding (+ optional screenshot). On success returns the
 * server-assigned `screenshotFile`. On failure the finding metadata is queued
 * (without the PNG — localStorage can't hold base64 images) for later retry.
 */
export async function submitFinding(
  finding: UatFinding,
  pngBase64: string | undefined,
  config: TransportConfig = {},
): Promise<SubmitResult> {
  const result = await postFinding(finding, pngBase64, config);
  if (!result.ok) {
    enqueue(finding);
    return { ok: false, queued: true };
  }
  return result;
}

/**
 * Re-send everything in the retry queue. Findings that succeed are removed;
 * those that still fail stay queued (no duplication). Returns the count flushed.
 */
export async function flushQueue(config: TransportConfig = {}): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;

  const remaining: UatFinding[] = [];
  let flushed = 0;
  for (const finding of queue) {
    const result = await postFinding(finding, undefined, config);
    if (result.ok) flushed++;
    else remaining.push(finding);
  }
  writeQueue(remaining);
  return flushed;
}
