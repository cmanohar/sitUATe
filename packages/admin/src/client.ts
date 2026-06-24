/**
 * Collector API client for the admin route. All admin calls carry the optional
 * `x-situate-admin-token` (the server enforces it when configured); screenshots are
 * fetched as blobs so the header rides along (an <img src> can't set headers).
 */
import type {
  ListFindingsQuery,
  SituateFindingStatus,
  SituateGatingConfig,
  UatFinding,
} from '@situate/core';

export interface AdminClientOptions {
  collectorUrl: string;
  /** Sent as `x-situate-admin-token`. The host supplies it only to authenticated admins. */
  adminToken?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

function base(o: AdminClientOptions): string {
  return o.collectorUrl.replace(/\/+$/, '');
}

function headers(o: AdminClientOptions, extra?: Record<string, string>): Record<string, string> {
  return { ...(o.adminToken ? { 'x-situate-admin-token': o.adminToken } : {}), ...extra };
}

function qs(query: ListFindingsQuery): string {
  const p = new URLSearchParams();
  if (query.from) p.set('from', query.from);
  if (query.to) p.set('to', query.to);
  if (query.status) p.set('status', query.status);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listFindings(
  o: AdminClientOptions,
  query: ListFindingsQuery = {},
): Promise<UatFinding[]> {
  const f = o.fetchImpl ?? globalThis.fetch;
  const res = await f(`${base(o)}/findings${qs(query)}`, { headers: headers(o) });
  if (!res.ok) throw new Error(`listFindings failed: ${res.status}`);
  return (await res.json()) as UatFinding[];
}

export async function setStatus(
  o: AdminClientOptions,
  id: string,
  status: SituateFindingStatus,
): Promise<void> {
  const f = o.fetchImpl ?? globalThis.fetch;
  const res = await f(`${base(o)}/findings/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: headers(o, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`setStatus failed: ${res.status}`);
}

export async function getConfig(o: AdminClientOptions, env: string): Promise<SituateGatingConfig> {
  const f = o.fetchImpl ?? globalThis.fetch;
  const res = await f(`${base(o)}/config/${encodeURIComponent(env)}`, { headers: headers(o) });
  if (!res.ok) throw new Error(`getConfig failed: ${res.status}`);
  return (await res.json()) as SituateGatingConfig;
}

export async function setConfig(
  o: AdminClientOptions,
  env: string,
  cfg: SituateGatingConfig,
): Promise<void> {
  const f = o.fetchImpl ?? globalThis.fetch;
  const res = await f(`${base(o)}/config/${encodeURIComponent(env)}`, {
    method: 'PUT',
    headers: headers(o, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(cfg),
  });
  if (!res.ok) throw new Error(`setConfig failed: ${res.status}`);
}

/** Fetch a screenshot's bytes (with the admin header) as a Blob, or null if missing. */
export async function fetchScreenshot(
  o: AdminClientOptions,
  filename: string,
): Promise<Blob | null> {
  const f = o.fetchImpl ?? globalThis.fetch;
  const res = await f(`${base(o)}/shots/${encodeURIComponent(filename)}`, { headers: headers(o) });
  if (!res.ok) return null;
  return res.blob();
}
