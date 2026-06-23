#!/usr/bin/env node
/**
 * Flow collector — standalone ingest service for staging/clone instances.
 *
 * Implements the transport contract the overlay POSTs to:
 *   POST /uat/feedback  { finding, pngBase64? }  → 200 { screenshotFile? }
 *   GET  /healthz       → 200
 *
 * Dependency-free (Node http) so it deploys as a container, Cloud Run service,
 * or sidecar. Storage is a local dir (FLOW_STORAGE_DIR) — mount a volume. The
 * report CLI (`flow-report`) reads the same JSONL layout the Vite plugin writes.
 *
 * Config (env):
 *   PORT                default 8080
 *   FLOW_STORAGE_DIR    default ./flow-data
 *   FLOW_ALLOWED_ORIGIN CORS origin for the app (default *)
 *   FLOW_INGEST_TOKEN   if set, require matching `x-flow-token` header
 *
 * SECURITY: this seed is token-gated only. Sprint 2/3 add the pluggable
 * StorageAdapter, and the flag/allowlist API that enforces per-user/role gating
 * via the host's AuthContext (NO identity provider is baked in — the host owns
 * identity). Enforce your own allowlist here before writing in production.
 */
import { createServer } from 'node:http';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT) || 8080;
const STORAGE_DIR = process.env.FLOW_STORAGE_DIR || resolve(process.cwd(), 'flow-data');
const ALLOWED_ORIGIN = process.env.FLOW_ALLOWED_ORIGIN || '*';
const INGEST_TOKEN = process.env.FLOW_INGEST_TOKEN || '';
const MAX_BODY = 25 * 1024 * 1024;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-flow-token');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function json(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > MAX_BODY) {
        rej(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => res(data));
    req.on('error', rej);
  });
}

function isoDate(ts) {
  return ts && /^\d{4}-\d{2}-\d{2}/.test(ts) ? ts.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    cors(res);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/healthz') {
    json(res, 200, { ok: true });
    return;
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/uat/feedback')) {
    json(res, 404, { error: 'not found' });
    return;
  }
  if (INGEST_TOKEN && req.headers['x-flow-token'] !== INGEST_TOKEN) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  try {
    const { finding, pngBase64 } = JSON.parse(await readBody(req));
    if (!finding || typeof finding !== 'object') {
      json(res, 400, { error: 'missing finding' });
      return;
    }

    const date = isoDate(finding.timestamp);
    const sessionDir = resolve(STORAGE_DIR, date);
    mkdirSync(resolve(sessionDir, 'shots'), { recursive: true });

    let screenshotFile;
    if (pngBase64) {
      // Server-generated filename — never trust client input (path traversal).
      screenshotFile = `${randomUUID()}.png`;
      const base64 = String(pngBase64).replace(/^data:image\/png;base64,/, '');
      writeFileSync(resolve(sessionDir, 'shots', screenshotFile), Buffer.from(base64, 'base64'));
      finding.screenshotFile = screenshotFile;
    }

    appendFileSync(resolve(sessionDir, 'findings.jsonl'), JSON.stringify(finding) + '\n');
    json(res, 200, { screenshotFile });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'write failed' });
  }
});

server.listen(PORT, () => {
  console.log(`flow-collector listening on :${PORT} → ${STORAGE_DIR}`);
});
