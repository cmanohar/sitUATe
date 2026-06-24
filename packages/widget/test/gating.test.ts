import { describe, it, expect, vi } from 'vitest';
import type { SituateAuthContext, SituateGatingConfig } from '@situate/core';
import { userPasses, resolveGating } from '../src/gating.js';

const auth = (over: Partial<SituateAuthContext> = {}): SituateAuthContext => ({
  userId: 'u1',
  roles: ['qa'],
  isAdmin: false,
  ...over,
});

const cfg = (over: Partial<SituateGatingConfig> = {}): SituateGatingConfig => ({
  enabled: true,
  allowedRoles: [],
  allowedUserIds: [],
  ...over,
});

function fetchReturning(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('userPasses', () => {
  it('denies when disabled', () => {
    expect(userPasses(auth(), cfg({ enabled: false }))).toBe(false);
  });

  it('allows any authenticated user when the allowlist is empty', () => {
    expect(userPasses(auth(), cfg())).toBe(true);
  });

  it('denies when there is no authenticated user', () => {
    expect(userPasses(undefined, cfg())).toBe(false);
  });

  it('allows on a role match', () => {
    expect(userPasses(auth({ roles: ['qa'] }), cfg({ allowedRoles: ['qa'] }))).toBe(true);
  });

  it('allows on a user-id match even without a role match', () => {
    expect(
      userPasses(auth({ roles: ['dev'], userId: 'u9' }), cfg({ allowedRoles: ['qa'], allowedUserIds: ['u9'] })),
    ).toBe(true);
  });

  it('denies when neither role nor id matches', () => {
    expect(
      userPasses(auth({ roles: ['dev'], userId: 'u1' }), cfg({ allowedRoles: ['qa'], allowedUserIds: ['u9'] })),
    ).toBe(false);
  });
});

describe('resolveGating', () => {
  it('allows in dev mode (no collectorUrl) without fetching', async () => {
    const f = vi.fn();
    expect(await resolveGating({}, f as unknown as typeof fetch)).toBe('allowed');
    expect(f).not.toHaveBeenCalled();
  });

  it('allows when the collector enables the user', async () => {
    const f = fetchReturning(200, cfg({ enabled: true, allowedRoles: ['qa'] }));
    expect(await resolveGating({ collectorUrl: 'https://c', auth: auth() }, f)).toBe('allowed');
  });

  it('denies when the collector disables the env', async () => {
    const f = fetchReturning(200, cfg({ enabled: false }));
    expect(await resolveGating({ collectorUrl: 'https://c', auth: auth() }, f)).toBe('denied');
  });

  it('fail-closed on a non-200 (missing config)', async () => {
    const f = fetchReturning(404, {});
    expect(await resolveGating({ collectorUrl: 'https://c', auth: auth() }, f)).toBe('denied');
  });

  it('fail-closed when the fetch throws (collector unreachable)', async () => {
    const f = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await resolveGating({ collectorUrl: 'https://c', auth: auth() }, f)).toBe('denied');
  });

  it('queries the configured environment', async () => {
    const f = fetchReturning(200, cfg());
    await resolveGating({ collectorUrl: 'https://c/', auth: auth(), environment: 'staging' }, f);
    expect(f).toHaveBeenCalledWith('https://c/config/staging');
  });
});
