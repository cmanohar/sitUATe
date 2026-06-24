import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildFinding,
  captureElement,
  captureViewport,
  getCurrentRoute,
  installLocationTracking,
  extractElementMeta,
  flushQueue,
  submitFinding,
  STORAGE_KEYS,
} from '@situate/core';
import type {
  BoundingBox,
  TesterRole,
  TransportConfig,
  UatEnvironment,
  UatScope,
  UatSeverity,
} from '@situate/core';

export interface SubmitInput {
  scope: UatScope;
  comment: string;
  severity: UatSeverity;
  category?: 'bug' | 'change' | 'question';
  element?: Element;
  box?: BoundingBox;
}

/**
 * Read build-time env safely. In a Vite host `import.meta.env` is replaced at
 * build; in other contexts it may be undefined — guard so the widget never
 * crashes outside Vite.
 */
function situateEnv(): Record<string, string | undefined> {
  try {
    return (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    );
  } catch {
    return {};
  }
}

/** Collector URL from explicit config (Sprint 3) falling back to the build-time env var. */
function collectorUrl(override?: string): string | undefined {
  return override || situateEnv().VITE_SITUATE_COLLECTOR_URL || undefined;
}

function transportConfig(override?: string): TransportConfig {
  return { collectorUrl: collectorUrl(override) };
}

function environment(override?: string): UatEnvironment {
  return collectorUrl(override) ? 'clone' : 'local';
}

function testerRole(): TesterRole | undefined {
  const v = localStorage.getItem(STORAGE_KEYS.testerRole);
  return v === 'hcp' || v === 'internal' ? v : undefined;
}

/**
 * Session glue: tracks the current route, owns the findings count, and submits
 * findings (capture → transport). Each piece (location, capture, transport,
 * finding) is unit-tested in isolation in @situate/core; this hook just
 * composes them.
 */
export function useUatSession(
  opts: { collectorUrl?: string; redactSelectors?: string[]; captureScreenshots?: boolean } = {},
) {
  const url = opts.collectorUrl;
  const redactSelectors = opts.redactSelectors;
  const captureOff = opts.captureScreenshots === false;
  const [route, setRoute] = useState(getCurrentRoute());
  const [count, setCount] = useState(0);
  const sessionId = useRef<string>();
  if (!sessionId.current) sessionId.current = globalThis.crypto.randomUUID();

  useEffect(() => {
    const cleanup = installLocationTracking(() => setRoute(getCurrentRoute()));
    // Best-effort flush of anything queued from a previous offline session.
    void flushQueue(transportConfig(url));
    return cleanup;
  }, [url]);

  const submit = useCallback(async (input: SubmitInput) => {
    const finding = buildFinding({
      sessionId: sessionId.current!,
      environment: environment(url),
      scope: input.scope,
      route: getCurrentRoute(),
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
      severity: input.severity,
      comment: input.comment,
      category: input.category,
      selector: input.element
        ? extractElementMeta(input.element, { redactSelectors })
        : undefined,
      boundingBox: input.box,
      testerRole: testerRole(),
      userAgent: navigator.userAgent,
    });

    // captureScreenshots:false → metadata-only feedback (no PNG produced).
    const png = captureOff
      ? undefined
      : input.scope === 'element' && input.element
        ? await captureElement(input.element, { redactSelectors })
        : await captureViewport({ redactSelectors });

    const result = await submitFinding(finding, png, transportConfig(url));
    setCount((c) => c + 1);
    return result;
  }, [url, captureOff, redactSelectors]);

  return { route, count, environment: environment(url), submit };
}
