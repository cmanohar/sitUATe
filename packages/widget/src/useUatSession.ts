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
} from '@cmanohar/flow-core';
import type {
  BoundingBox,
  TesterRole,
  TransportConfig,
  UatEnvironment,
  UatScope,
  UatSeverity,
} from '@cmanohar/flow-core';

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
function flowEnv(): Record<string, string | undefined> {
  try {
    return (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    );
  } catch {
    return {};
  }
}

function transportConfig(): TransportConfig {
  return { collectorUrl: flowEnv().VITE_FLOW_COLLECTOR_URL || undefined };
}

function environment(): UatEnvironment {
  return flowEnv().VITE_FLOW_COLLECTOR_URL ? 'clone' : 'local';
}

function testerRole(): TesterRole | undefined {
  const v = localStorage.getItem(STORAGE_KEYS.testerRole);
  return v === 'hcp' || v === 'internal' ? v : undefined;
}

/**
 * Session glue: tracks the current route, owns the findings count, and submits
 * findings (capture → transport). Each piece (location, capture, transport,
 * finding) is unit-tested in isolation in @cmanohar/flow-core; this hook just
 * composes them.
 */
export function useUatSession() {
  const [route, setRoute] = useState(getCurrentRoute());
  const [count, setCount] = useState(0);
  const sessionId = useRef<string>();
  if (!sessionId.current) sessionId.current = globalThis.crypto.randomUUID();

  useEffect(() => {
    const cleanup = installLocationTracking(() => setRoute(getCurrentRoute()));
    // Best-effort flush of anything queued from a previous offline session.
    void flushQueue(transportConfig());
    return cleanup;
  }, []);

  const submit = useCallback(async (input: SubmitInput) => {
    const finding = buildFinding({
      sessionId: sessionId.current!,
      environment: environment(),
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
      selector: input.element ? extractElementMeta(input.element) : undefined,
      boundingBox: input.box,
      testerRole: testerRole(),
      userAgent: navigator.userAgent,
    });

    const png =
      input.scope === 'element' && input.element
        ? await captureElement(input.element)
        : await captureViewport();

    const result = await submitFinding(finding, png, transportConfig());
    setCount((c) => c + 1);
    return result;
  }, []);

  return { route, count, environment: environment(), submit };
}
