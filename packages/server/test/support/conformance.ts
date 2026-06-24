import { describe, it, expect } from 'vitest';
import type { StorageAdapter } from '@situate/core';
import { makeFinding, TINY_PNG } from './fixtures.js';

/**
 * The contract every `StorageAdapter` must satisfy. Each adapter's test file calls
 * this with a factory that returns a fresh, isolated adapter per test.
 */
export function runStorageAdapterConformance(
  label: string,
  makeAdapter: () => Promise<StorageAdapter> | StorageAdapter,
): void {
  describe(`StorageAdapter conformance: ${label}`, () => {
    it('round-trips a finding through save → list', async () => {
      const a = await makeAdapter();
      const f = makeFinding({ comment: 'hello' });
      await a.saveFinding(f);
      const list = await a.listFindings({});
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(f.id);
      expect(list[0].comment).toBe('hello');
    });

    it('defaults an unset status to "new" on save', async () => {
      const a = await makeAdapter();
      await a.saveFinding(makeFinding({ status: undefined }));
      const [stored] = await a.listFindings({});
      expect(stored.status).toBe('new');
    });

    it('is idempotent on finding.id (re-save overwrites)', async () => {
      const a = await makeAdapter();
      const f = makeFinding({ comment: 'first' });
      await a.saveFinding(f);
      await a.saveFinding({ ...f, comment: 'second' });
      const list = await a.listFindings({});
      expect(list).toHaveLength(1);
      expect(list[0].comment).toBe('second');
    });

    it('lists findings newest-first by timestamp', async () => {
      const a = await makeAdapter();
      await a.saveFinding(makeFinding({ id: 'older', timestamp: '2026-06-20T09:00:00.000Z' }));
      await a.saveFinding(makeFinding({ id: 'newer', timestamp: '2026-06-24T09:00:00.000Z' }));
      const list = await a.listFindings({});
      expect(list.map((f) => f.id)).toEqual(['newer', 'older']);
    });

    it('filters by status', async () => {
      const a = await makeAdapter();
      await a.saveFinding(makeFinding({ id: 'n1', status: 'new' }));
      await a.saveFinding(makeFinding({ id: 's1', status: 'shipped' }));
      const shipped = await a.listFindings({ status: 'shipped' });
      expect(shipped.map((f) => f.id)).toEqual(['s1']);
    });

    it('filters by inclusive from/to date window', async () => {
      const a = await makeAdapter();
      await a.saveFinding(makeFinding({ id: 'd19', timestamp: '2026-06-19T12:00:00.000Z' }));
      await a.saveFinding(makeFinding({ id: 'd22', timestamp: '2026-06-22T12:00:00.000Z' }));
      await a.saveFinding(makeFinding({ id: 'd25', timestamp: '2026-06-25T12:00:00.000Z' }));
      const win = await a.listFindings({ from: '2026-06-22', to: '2026-06-25' });
      expect(win.map((f) => f.id).sort()).toEqual(['d22', 'd25']);
    });

    it('saves a screenshot and returns a server-generated .png filename', async () => {
      const a = await makeAdapter();
      const name = await a.saveScreenshot('finding-x', TINY_PNG);
      expect(name).toMatch(/\.png$/);
      // never echoes a client-controllable path
      expect(name).not.toContain('/');
      expect(name).not.toContain('..');
    });

    it('reads a saved screenshot back by filename, null for unknown/unsafe names', async () => {
      const a = await makeAdapter();
      const name = await a.saveScreenshot('finding-x', TINY_PNG);
      const bytes = await a.readScreenshot(name);
      expect(bytes).not.toBeNull();
      expect(Buffer.compare(bytes as Buffer, TINY_PNG)).toBe(0);
      expect(await a.readScreenshot('does-not-exist.png')).toBeNull();
      expect(await a.readScreenshot('../../etc/passwd')).toBeNull(); // traversal rejected
    });

    it('updates a finding status via setStatus', async () => {
      const a = await makeAdapter();
      const f = makeFinding({ status: 'new' });
      await a.saveFinding(f);
      await a.setStatus(f.id, 'triaged');
      const [stored] = await a.listFindings({});
      expect(stored.status).toBe('triaged');
    });

    it('rejects setStatus on an unknown finding', async () => {
      const a = await makeAdapter();
      await expect(a.setStatus('nope', 'triaged')).rejects.toThrow();
    });

    it('returns the fail-closed default config before any is set', async () => {
      const a = await makeAdapter();
      const cfg = await a.getGatingConfig('production');
      expect(cfg).toEqual({ enabled: false, allowedRoles: [], allowedUserIds: [] });
    });

    it('round-trips a gating config per environment', async () => {
      const a = await makeAdapter();
      await a.setGatingConfig('staging', {
        enabled: true,
        allowedRoles: ['qa'],
        allowedUserIds: ['u1'],
      });
      expect(await a.getGatingConfig('staging')).toEqual({
        enabled: true,
        allowedRoles: ['qa'],
        allowedUserIds: ['u1'],
      });
      // environments are isolated
      expect((await a.getGatingConfig('production')).enabled).toBe(false);
    });
  });
}
