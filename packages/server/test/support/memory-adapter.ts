import { randomUUID } from 'node:crypto';
import {
  DEFAULT_GATING_CONFIG,
  type ListFindingsQuery,
  type SituateFindingStatus,
  type SituateGatingConfig,
  type StorageAdapter,
  type UatFinding,
} from '@situate/core';

/**
 * In-memory reference adapter. The simplest thing that satisfies the contract —
 * used to exercise the conformance suite and as a backing store in route tests.
 */
export class InMemoryAdapter implements StorageAdapter {
  private findings = new Map<string, UatFinding>();
  private screenshots = new Map<string, Buffer>();
  private configs = new Map<string, SituateGatingConfig>();

  async saveFinding(f: UatFinding): Promise<void> {
    this.findings.set(f.id, { ...f, status: f.status ?? 'new' });
  }

  async saveScreenshot(_findingId: string, png: Buffer): Promise<string> {
    const filename = `${randomUUID()}.png`;
    this.screenshots.set(filename, png);
    return filename;
  }

  async listFindings(query: ListFindingsQuery): Promise<UatFinding[]> {
    return [...this.findings.values()]
      .filter((f) => matchesQuery(f, query))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async setStatus(findingId: string, status: SituateFindingStatus): Promise<void> {
    const f = this.findings.get(findingId);
    if (!f) throw new Error(`unknown finding: ${findingId}`);
    this.findings.set(findingId, { ...f, status });
  }

  async getGatingConfig(env: string): Promise<SituateGatingConfig> {
    return this.configs.get(env) ?? { ...DEFAULT_GATING_CONFIG };
  }

  async setGatingConfig(env: string, cfg: SituateGatingConfig): Promise<void> {
    this.configs.set(env, cfg);
  }
}

/** Shared filter logic: status exact-match + inclusive date-window on the timestamp's date. */
export function matchesQuery(f: UatFinding, query: ListFindingsQuery): boolean {
  if (query.status && f.status !== query.status) return false;
  const day = f.timestamp.slice(0, 10);
  if (query.from && day < query.from) return false;
  if (query.to && day > query.to) return false;
  return true;
}
