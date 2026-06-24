import { afterEach, describe, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { InMemoryAdapter } from './support/memory-adapter.js';
import { makeFinding, TINY_PNG } from './support/fixtures.js';

let app: FastifyInstance | undefined;

async function start(opts: { ingestToken?: string; adminToken?: string } = {}) {
  const adapter = new InMemoryAdapter();
  app = await buildServer({ adapter, ...opts });
  await app.ready();
  return { adapter, app };
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('routes', () => {
  it('GET /healthz returns ok', async () => {
    const { app } = await start();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('POST /uat/feedback persists a finding and defaults status to new', async () => {
    const { app, adapter } = await start();
    const finding = makeFinding({ id: 'f1' });
    const res = await app.inject({ method: 'POST', url: '/uat/feedback', payload: { finding } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({}); // no screenshot → screenshotFile undefined
    const list = await adapter.listFindings({});
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('new');
  });

  it('POST /uat/feedback with a PNG returns a server-generated screenshotFile', async () => {
    const { app } = await start();
    const finding = makeFinding({ id: 'f2' });
    const res = await app.inject({
      method: 'POST',
      url: '/uat/feedback',
      payload: { finding, pngBase64: TINY_PNG.toString('base64') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().screenshotFile).toMatch(/\.png$/);
  });

  it('rejects ingest without the configured token, accepts with it', async () => {
    const { app } = await start({ ingestToken: 'secret' });
    const finding = makeFinding();
    const unauth = await app.inject({ method: 'POST', url: '/uat/feedback', payload: { finding } });
    expect(unauth.statusCode).toBe(401);
    const authed = await app.inject({
      method: 'POST',
      url: '/uat/feedback',
      headers: { 'x-situate-token': 'secret' },
      payload: { finding },
    });
    expect(authed.statusCode).toBe(200);
  });

  it('400s when finding is missing (schema validation)', async () => {
    const { app } = await start();
    const res = await app.inject({ method: 'POST', url: '/uat/feedback', payload: { pngBase64: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('GET /config/:env returns the fail-closed default before any is set', async () => {
    const { app } = await start();
    const res = await app.inject({ method: 'GET', url: '/config/production' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ enabled: false, allowedRoles: [], allowedUserIds: [] });
  });

  it('PUT then GET /config/:env round-trips a gating config', async () => {
    const { app } = await start();
    const cfg = { enabled: true, allowedRoles: ['qa'], allowedUserIds: ['u1'] };
    const put = await app.inject({ method: 'PUT', url: '/config/staging', payload: cfg });
    expect(put.statusCode).toBe(200);
    const get = await app.inject({ method: 'GET', url: '/config/staging' });
    expect(get.json()).toEqual(cfg);
  });

  it('400s on a malformed gating config (strict schema)', async () => {
    const { app } = await start();
    const res = await app.inject({
      method: 'PUT',
      url: '/config/staging',
      payload: { enabled: 'yes' }, // wrong type + missing fields
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /findings lists ingested findings and filters by status', async () => {
    const { app } = await start();
    await app.inject({ method: 'POST', url: '/uat/feedback', payload: { finding: makeFinding({ id: 'a' }) } });
    await app.inject({ method: 'POST', url: '/uat/feedback', payload: { finding: makeFinding({ id: 'b' }) } });
    const all = await app.inject({ method: 'GET', url: '/findings' });
    expect(all.json()).toHaveLength(2);
    const shipped = await app.inject({ method: 'GET', url: '/findings?status=shipped' });
    expect(shipped.json()).toHaveLength(0);
  });

  it('PUT /findings/:id/status updates status; 404 for unknown', async () => {
    const { app } = await start();
    await app.inject({ method: 'POST', url: '/uat/feedback', payload: { finding: makeFinding({ id: 'x' }) } });
    const ok = await app.inject({ method: 'PUT', url: '/findings/x/status', payload: { status: 'triaged' } });
    expect(ok.statusCode).toBe(200);
    const list = await app.inject({ method: 'GET', url: '/findings?status=triaged' });
    expect(list.json().map((f: { id: string }) => f.id)).toEqual(['x']);
    const missing = await app.inject({ method: 'PUT', url: '/findings/nope/status', payload: { status: 'triaged' } });
    expect(missing.statusCode).toBe(404);
  });

  it('GET /shots/:filename returns PNG bytes; 404 for unknown', async () => {
    const { app } = await start();
    const post = await app.inject({
      method: 'POST',
      url: '/uat/feedback',
      payload: { finding: makeFinding({ id: 's' }), pngBase64: TINY_PNG.toString('base64') },
    });
    const file = post.json().screenshotFile as string;
    const shot = await app.inject({ method: 'GET', url: `/shots/${file}` });
    expect(shot.statusCode).toBe(200);
    expect(shot.headers['content-type']).toContain('image/png');
    const missing = await app.inject({ method: 'GET', url: '/shots/nope.png' });
    expect(missing.statusCode).toBe(404);
  });

  it('admin routes require the admin token when configured; GET /config stays open', async () => {
    const { app } = await start({ adminToken: 'admin-secret' });
    // open: widget gating read
    expect((await app.inject({ method: 'GET', url: '/config/production' })).statusCode).toBe(200);
    // guarded without token
    expect((await app.inject({ method: 'GET', url: '/findings' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'PUT', url: '/config/staging', payload: { enabled: true, allowedRoles: [], allowedUserIds: [] } })).statusCode,
    ).toBe(401);
    // guarded with token
    const headers = { 'x-situate-admin-token': 'admin-secret' };
    expect((await app.inject({ method: 'GET', url: '/findings', headers })).statusCode).toBe(200);
  });
});
