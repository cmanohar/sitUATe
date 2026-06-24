/**
 * Files storage adapter — parity with the JSONL layout the Vite plugin and the
 * standalone `collector.mjs` already write, so `situate report` reads the same data.
 *
 *   <dir>/<date>/findings.jsonl     one finding per line, grouped by capture day
 *   <dir>/shots/<uuid>.png          screenshots, server-named, flat (served by filename)
 *   <dir>/config/<env>.json         per-environment gating config
 *
 * Findings stay per-date for report parity; `renderReport` references screenshots by
 * bare filename only, so a flat `shots/` dir keeps retrieval-by-filename simple (S4).
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_GATING_CONFIG,
  type ListFindingsQuery,
  type SituateFindingStatus,
  type SituateGatingConfig,
  type StorageAdapter,
  type UatFinding,
} from '@situate/core';

const DATE_DIR = /^\d{4}-\d{2}-\d{2}(-.+)?$/; // `<date>` or `<date>-<user>`

function isoDate(timestamp?: string): string {
  return timestamp && /^\d{4}-\d{2}-\d{2}/.test(timestamp)
    ? timestamp.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

function readJsonl(file: string): UatFinding[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as UatFinding);
}

export class FilesAdapter implements StorageAdapter {
  constructor(private readonly dir: string) {}

  private findingsFile(date: string): string {
    const sessionDir = resolve(this.dir, date);
    mkdirSync(sessionDir, { recursive: true });
    return resolve(sessionDir, 'findings.jsonl');
  }

  /** Every `<date>/findings.jsonl` under the storage dir. */
  private allFindingFiles(): { date: string; file: string }[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && DATE_DIR.test(d.name))
      .map((d) => ({ date: d.name, file: resolve(this.dir, d.name, 'findings.jsonl') }))
      .filter((d) => existsSync(d.file));
  }

  async saveFinding(f: UatFinding): Promise<void> {
    const record: UatFinding = { ...f, status: f.status ?? 'new' };
    const file = this.findingsFile(isoDate(f.timestamp));
    const existing = readJsonl(file);
    const idx = existing.findIndex((e) => e.id === f.id);
    if (idx === -1) {
      appendFileSync(file, JSON.stringify(record) + '\n');
    } else {
      existing[idx] = record; // idempotent re-save
      writeFileSync(file, existing.map((e) => JSON.stringify(e)).join('\n') + '\n');
    }
  }

  async saveScreenshot(_findingId: string, png: Buffer): Promise<string> {
    const shotsDir = resolve(this.dir, 'shots');
    mkdirSync(shotsDir, { recursive: true });
    // Filename is always server-generated — never trust client input (path traversal).
    const filename = `${randomUUID()}.png`;
    writeFileSync(resolve(shotsDir, filename), png);
    return filename;
  }

  async listFindings(query: ListFindingsQuery): Promise<UatFinding[]> {
    const all = this.allFindingFiles().flatMap(({ file }) => readJsonl(file));
    return all
      .filter((f) => matchesQuery(f, query))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async setStatus(findingId: string, status: SituateFindingStatus): Promise<void> {
    for (const { file } of this.allFindingFiles()) {
      const findings = readJsonl(file);
      const idx = findings.findIndex((f) => f.id === findingId);
      if (idx === -1) continue;
      findings[idx] = { ...findings[idx], status };
      writeFileSync(file, findings.map((f) => JSON.stringify(f)).join('\n') + '\n');
      return;
    }
    throw new Error(`unknown finding: ${findingId}`);
  }

  private configFile(env: string): string {
    const configDir = resolve(this.dir, 'config');
    mkdirSync(configDir, { recursive: true });
    // env is a path segment — guard against traversal.
    return resolve(configDir, `${env.replace(/[^a-z0-9_-]/gi, '_')}.json`);
  }

  async getGatingConfig(env: string): Promise<SituateGatingConfig> {
    const file = this.configFile(env);
    if (!existsSync(file)) return { ...DEFAULT_GATING_CONFIG };
    return JSON.parse(readFileSync(file, 'utf8')) as SituateGatingConfig;
  }

  async setGatingConfig(env: string, cfg: SituateGatingConfig): Promise<void> {
    writeFileSync(this.configFile(env), JSON.stringify(cfg, null, 2));
  }
}

/** Status exact-match + inclusive date-window on the timestamp's date. */
function matchesQuery(f: UatFinding, query: ListFindingsQuery): boolean {
  if (query.status && f.status !== query.status) return false;
  const day = f.timestamp.slice(0, 10);
  if (query.from && day < query.from) return false;
  if (query.to && day > query.to) return false;
  return true;
}
