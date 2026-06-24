import { useEffect, useState } from 'react';
import type { SituateAuthContext, SituateGatingConfig } from '@situate/core';

/**
 * Runtime gating (D5). The widget asks the collector "is Situate on for this user,
 * in this environment?" on mount and renders only if the answer is yes. Fail-closed:
 * any error, missing config, or absent collector in a non-dev environment hides the
 * overlay. Dev mode — no `collectorUrl` — stays on for local UAT.
 */

export interface SituateConfig {
  /** Remote collector base URL. Absent → dev mode (overlay always on, posts to the Vite sink). */
  collectorUrl?: string;
  /** Host-supplied identity. Situate never owns auth. */
  auth?: SituateAuthContext;
  /** Deploy env name for the config lookup (`GET /config/:env`). Default `'production'`. */
  environment?: string;
  /** Extra selectors to mask in screenshots (always-on: `[data-uat-redact]` + form fields). */
  redactSelectors?: string[];
  /** Capture screenshots at all. Default `true`; `false` → metadata-only feedback (D7). */
  captureScreenshots?: boolean;
}

export type GatingDecision = 'pending' | 'allowed' | 'denied';

/** Pure allow/deny against a resolved config. `enabled` plus a role/id (or "all authenticated"). */
export function userPasses(
  auth: SituateAuthContext | undefined,
  cfg: SituateGatingConfig,
): boolean {
  if (!cfg.enabled) return false;
  if (!auth) return false; // "all authenticated" still requires an authenticated user
  const noAllowlist = cfg.allowedRoles.length === 0 && cfg.allowedUserIds.length === 0;
  if (noAllowlist) return true; // empty allowlist = all authenticated
  const roleMatch = auth.roles.some((r) => cfg.allowedRoles.includes(r));
  const idMatch = cfg.allowedUserIds.includes(auth.userId);
  return roleMatch || idMatch;
}

/**
 * Resolve the gating decision against the collector. Never throws — any failure
 * resolves to `'denied'` (fail-closed). Dev mode (no collectorUrl) → `'allowed'`.
 */
export async function resolveGating(
  config: SituateConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Exclude<GatingDecision, 'pending'>> {
  if (!config.collectorUrl) return 'allowed'; // dev mode stays on
  try {
    const env = config.environment ?? 'production';
    const base = config.collectorUrl.replace(/\/+$/, '');
    const res = await fetchImpl(`${base}/config/${encodeURIComponent(env)}`);
    if (!res.ok) return 'denied';
    const cfg = (await res.json()) as SituateGatingConfig;
    return userPasses(config.auth, cfg) ? 'allowed' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Resolve gating on mount. Starts `'allowed'` in dev (no flash) and `'pending'`
 * when a collector must be consulted; settles to `'allowed'`/`'denied'`.
 */
export function useGating(
  config: SituateConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
): GatingDecision {
  const [decision, setDecision] = useState<GatingDecision>(
    config.collectorUrl ? 'pending' : 'allowed',
  );
  useEffect(() => {
    let cancelled = false;
    void resolveGating(config, fetchImpl).then((d) => {
      if (!cancelled) setDecision(d);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return decision;
}
