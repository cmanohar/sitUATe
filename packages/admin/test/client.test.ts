import { describe, it, expect, vi } from 'vitest';
import { listFindings, setStatus, setConfig, type AdminClientOptions } from '../src/client.js';

function spyFetch(body: unknown = []) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body, blob: async () => new Blob() })) as unknown as typeof fetch;
}

const opts = (over: Partial<AdminClientOptions> = {}): AdminClientOptions => ({
  collectorUrl: 'https://c/',
  adminToken: 'tok',
  ...over,
});

describe('admin client', () => {
  it('lists findings with the admin token header and query string', async () => {
    const f = spyFetch([]);
    await listFindings(opts({ fetchImpl: f }), { status: 'new' });
    expect(f).toHaveBeenCalledWith('https://c/findings?status=new', {
      headers: { 'x-situate-admin-token': 'tok' },
    });
  });

  it('omits the token header when none is configured', async () => {
    const f = spyFetch([]);
    await listFindings(opts({ adminToken: undefined, fetchImpl: f }));
    expect(f).toHaveBeenCalledWith('https://c/findings', { headers: {} });
  });

  it('PUTs a status update', async () => {
    const f = spyFetch();
    await setStatus(opts({ fetchImpl: f }), 'id 1', 'triaged');
    expect(f).toHaveBeenCalledWith('https://c/findings/id%201/status', {
      method: 'PUT',
      headers: { 'x-situate-admin-token': 'tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'triaged' }),
    });
  });

  it('PUTs a gating config', async () => {
    const f = spyFetch();
    const cfg = { enabled: true, allowedRoles: ['qa'], allowedUserIds: [] };
    await setConfig(opts({ fetchImpl: f }), 'staging', cfg);
    expect(f).toHaveBeenCalledWith('https://c/config/staging', {
      method: 'PUT',
      headers: { 'x-situate-admin-token': 'tok', 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
  });

  it('throws on a non-ok response', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    await expect(listFindings(opts({ fetchImpl: f }))).rejects.toThrow(/401/);
  });
});
