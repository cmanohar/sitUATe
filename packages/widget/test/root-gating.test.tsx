import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { UatRoot } from '../src/UatRoot';

const launcher = () => screen.queryByRole('button', { name: /uat feedback/i });

function mockFetch(status: number, body: unknown) {
  const f = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UatRoot runtime gating', () => {
  it('renders immediately in dev mode (no collectorUrl)', () => {
    render(<UatRoot config={{}} />);
    expect(launcher()).toBeInTheDocument();
  });

  it('renders once the collector enables the user', async () => {
    mockFetch(200, { enabled: true, allowedRoles: ['qa'], allowedUserIds: [] });
    render(
      <UatRoot
        config={{ collectorUrl: 'https://c', environment: 'production', auth: { userId: 'u1', roles: ['qa'], isAdmin: false } }}
      />,
    );
    // pending → nothing yet
    expect(launcher()).not.toBeInTheDocument();
    await waitFor(() => expect(launcher()).toBeInTheDocument());
  });

  it('stays hidden when the collector disables the env (fail-closed)', async () => {
    const f = mockFetch(200, { enabled: false, allowedRoles: [], allowedUserIds: [] });
    render(
      <UatRoot config={{ collectorUrl: 'https://c', auth: { userId: 'u1', roles: ['qa'], isAdmin: false } }} />,
    );
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(launcher()).not.toBeInTheDocument();
  });

  it('stays hidden when the collector is unreachable (fail-closed)', async () => {
    const f = vi.fn(async () => {
      throw new Error('network');
    });
    vi.stubGlobal('fetch', f);
    render(
      <UatRoot config={{ collectorUrl: 'https://c', auth: { userId: 'u1', roles: ['qa'], isAdmin: false } }} />,
    );
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(launcher()).not.toBeInTheDocument();
  });
});
