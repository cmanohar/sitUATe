import { useCallback, useEffect, useState } from 'react';
import type { ListFindingsQuery, SituateFindingStatus, UatFinding } from '@situate/core';
import { listFindings, setStatus as apiSetStatus, type AdminClientOptions } from './client.js';

export interface UseFindings {
  findings: UatFinding[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setStatus: (id: string, status: SituateFindingStatus) => Promise<void>;
}

/**
 * Loads findings from the collector and exposes a status mutator that writes
 * through and refreshes. Server-side `query` is status/date only; finer filters
 * (severity/category) are applied in the table client-side.
 */
export function useFindings(client: AdminClientOptions, query: ListFindingsQuery = {}): UseFindings {
  const [findings, setFindings] = useState<UatFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listFindings(client, query)
      .then((f) => {
        if (!cancelled) setFindings(f);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load findings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.collectorUrl, client.adminToken, query.from, query.to, query.status, nonce]);

  const setStatus = useCallback(
    async (id: string, status: SituateFindingStatus) => {
      await apiSetStatus(client, id, status);
      refresh();
    },
    [client, refresh],
  );

  return { findings, loading, error, refresh, setStatus };
}
