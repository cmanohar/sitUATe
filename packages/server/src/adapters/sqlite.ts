/**
 * SQLite storage adapter — the default self-host store (D3). Findings and gating
 * config live in the DB; screenshots stay on disk (the DB records the filename),
 * matching the files layout so the same `shots/` dir is servable by the admin route.
 *
 * Uses `better-sqlite3` (synchronous, battle-tested). Node floor is >=18, so the
 * built-in `node:sqlite` (Node 22+, experimental) is intentionally not used.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  DEFAULT_GATING_CONFIG,
  type ListFindingsQuery,
  type SituateFindingStatus,
  type SituateGatingConfig,
  type StorageAdapter,
  type UatFinding,
} from '@situate/core';

export interface SqliteAdapterOptions {
  /** SQLite file path. `:memory:` for tests. */
  dbPath: string;
  /** Dir for screenshot files. Defaults to `<dbDir>/shots`. */
  shotsDir?: string;
}

export class SqliteAdapter implements StorageAdapter {
  private readonly db: Database.Database;
  private readonly shotsDir: string;

  constructor(opts: SqliteAdapterOptions) {
    const dbDir = opts.dbPath === ':memory:' ? process.cwd() : dirname(opts.dbPath);
    if (opts.dbPath !== ':memory:') mkdirSync(dbDir, { recursive: true });
    this.shotsDir = opts.shotsDir ?? resolve(dbDir, 'shots');
    this.db = new Database(opts.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS findings (
        id        TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        status    TEXT NOT NULL,
        json      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_findings_ts ON findings(timestamp);
      CREATE TABLE IF NOT EXISTS gating_config (
        env  TEXT PRIMARY KEY,
        json TEXT NOT NULL
      );
    `);
  }

  async saveFinding(f: UatFinding): Promise<void> {
    const record: UatFinding = { ...f, status: f.status ?? 'new' };
    this.db
      .prepare(
        `INSERT INTO findings (id, timestamp, status, json) VALUES (@id, @timestamp, @status, @json)
         ON CONFLICT(id) DO UPDATE SET timestamp=@timestamp, status=@status, json=@json`,
      )
      .run({
        id: record.id,
        timestamp: record.timestamp,
        status: record.status,
        json: JSON.stringify(record),
      });
  }

  async saveScreenshot(_findingId: string, png: Buffer): Promise<string> {
    mkdirSync(this.shotsDir, { recursive: true });
    // Filename is always server-generated — never trust client input (path traversal).
    const filename = `${randomUUID()}.png`;
    writeFileSync(resolve(this.shotsDir, filename), png);
    return filename;
  }

  async listFindings(query: ListFindingsQuery): Promise<UatFinding[]> {
    const where: string[] = [];
    const params: Record<string, string> = {};
    if (query.status) {
      where.push('status = @status');
      params.status = query.status;
    }
    if (query.from) {
      where.push("substr(timestamp, 1, 10) >= @from");
      params.from = query.from;
    }
    if (query.to) {
      where.push("substr(timestamp, 1, 10) <= @to");
      params.to = query.to;
    }
    const sql =
      'SELECT json FROM findings' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY timestamp DESC';
    const rows = this.db.prepare(sql).all(params) as { json: string }[];
    return rows.map((r) => JSON.parse(r.json) as UatFinding);
  }

  async setStatus(findingId: string, status: SituateFindingStatus): Promise<void> {
    const row = this.db.prepare('SELECT json FROM findings WHERE id = ?').get(findingId) as
      | { json: string }
      | undefined;
    if (!row) throw new Error(`unknown finding: ${findingId}`);
    const updated: UatFinding = { ...(JSON.parse(row.json) as UatFinding), status };
    this.db
      .prepare('UPDATE findings SET status = ?, json = ? WHERE id = ?')
      .run(status, JSON.stringify(updated), findingId);
  }

  async getGatingConfig(env: string): Promise<SituateGatingConfig> {
    const row = this.db.prepare('SELECT json FROM gating_config WHERE env = ?').get(env) as
      | { json: string }
      | undefined;
    return row ? (JSON.parse(row.json) as SituateGatingConfig) : { ...DEFAULT_GATING_CONFIG };
  }

  async setGatingConfig(env: string, cfg: SituateGatingConfig): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO gating_config (env, json) VALUES (?, ?)
         ON CONFLICT(env) DO UPDATE SET json = excluded.json`,
      )
      .run(env, JSON.stringify(cfg));
  }

  /** Release the DB handle (tests, graceful shutdown). */
  close(): void {
    this.db.close();
  }
}
