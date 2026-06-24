/**
 * Situate storage contract (D3).
 *
 * The collector writes findings, screenshots, and gating config through this
 * interface; adapters are swappable (files for dev/parity, SQLite for self-host,
 * Postgres deferred to B1). Framework-agnostic — no Fastify/Node-http coupling —
 * so the HTTP layer stays thin and any adapter is unit-testable against the shared
 * conformance suite.
 */
import type { UatFinding } from './types.js';
import type { SituateFindingStatus, SituateGatingConfig } from './gating.js';

/** Query filters for the admin findings list. All optional; omitted = no filter. */
export interface ListFindingsQuery {
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `finding.timestamp`. */
  from?: string;
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `finding.timestamp`. */
  to?: string;
  status?: SituateFindingStatus;
}

export interface StorageAdapter {
  /**
   * Persist a finding. Idempotent on `finding.id` (re-save overwrites). If `status`
   * is unset, the adapter records it as `'new'` so every stored finding is triageable.
   */
  saveFinding(f: UatFinding): Promise<void>;
  /**
   * Persist a screenshot for a finding and return the server-generated filename
   * (never client-supplied — path-traversal guard lives here).
   */
  saveScreenshot(findingId: string, png: Buffer): Promise<string>;
  /**
   * Read a screenshot's bytes by its (server-generated) filename, or `null` if
   * unknown. Goes through the adapter so the HTTP layer never assumes disk storage.
   */
  readScreenshot(filename: string): Promise<Buffer | null>;
  /** List findings newest-first, filtered by the query. */
  listFindings(query: ListFindingsQuery): Promise<UatFinding[]>;
  /** Set a finding's triage status. */
  setStatus(findingId: string, status: SituateFindingStatus): Promise<void>;
  /** Resolve the gating config for an environment; returns the fail-closed default if unset. */
  getGatingConfig(env: string): Promise<SituateGatingConfig>;
  /** Persist the gating config for an environment. */
  setGatingConfig(env: string, cfg: SituateGatingConfig): Promise<void>;
}
