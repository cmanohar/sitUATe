import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { SituateAuthContext, UatFinding } from '@situate/core';
import { SituateAdmin } from '../src/SituateAdmin';

const admin: SituateAuthContext = { userId: 'a1', roles: ['admin'], isAdmin: true };

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
  comment: 'broken button',
  userAgent: 'x',
  status: 'new',
  ...over,
});

/** Route fetch by URL: /findings → list, /config → gating, PUT → ok. */
function installFetch(findings: UatFinding[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('/config/')) {
      return { ok: true, status: 200, json: async () => ({ enabled: false, allowedRoles: [], allowedUserIds: [] }) };
    }
    if (url.includes('/findings')) {
      return { ok: true, status: 200, json: async () => findings };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', f);
  return { f, calls };
}

afterEach(() => vi.unstubAllGlobals());

describe('SituateAdmin', () => {
  it('blocks non-admins', () => {
    installFetch([]);
    render(<SituateAdmin auth={{ userId: 'u', roles: [], isAdmin: false }} collectorUrl="https://c" />);
    expect(screen.getByText(/don’t have access/i)).toBeInTheDocument();
  });

  it('renders findings for an admin', async () => {
    installFetch([finding(), finding({ id: 'f2', comment: 'misaligned header', severity: 'Low' })]);
    render(<SituateAdmin auth={admin} collectorUrl="https://c" adminToken="tok" />);
    await waitFor(() => expect(screen.getByText('broken button')).toBeInTheDocument());
    expect(screen.getByText('misaligned header')).toBeInTheDocument();
  });

  it('filters by severity client-side', async () => {
    installFetch([finding({ comment: 'crit one', severity: 'Critical' }), finding({ id: 'f2', comment: 'low one', severity: 'Low' })]);
    render(<SituateAdmin auth={admin} collectorUrl="https://c" />);
    await waitFor(() => expect(screen.getByText('crit one')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('filter severity'), { target: { value: 'Critical' } });
    expect(screen.getByText('crit one')).toBeInTheDocument();
    expect(screen.queryByText('low one')).not.toBeInTheDocument();
  });

  it('writes a status change through the API', async () => {
    const { calls } = installFetch([finding({ id: 'fX' })]);
    render(<SituateAdmin auth={admin} collectorUrl="https://c" adminToken="tok" />);
    await waitFor(() => expect(screen.getByText('broken button')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('status for fX'), { target: { value: 'triaged' } });
    await waitFor(() =>
      expect(calls.some((c) => c.url.includes('/findings/fX/status') && c.init?.method === 'PUT')).toBe(true),
    );
  });

  it('renders the gating editor once config loads', async () => {
    installFetch([finding()]);
    render(<SituateAdmin auth={admin} collectorUrl="https://c" environment="staging" />);
    await waitFor(() => expect(screen.getByText(/Runtime gating/i)).toBeInTheDocument());
    expect(screen.getByLabelText('allowed roles')).toBeInTheDocument();
  });
});
