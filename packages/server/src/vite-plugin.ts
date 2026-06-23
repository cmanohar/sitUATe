import { resolve } from 'node:path';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Local-dev bridge for the Flow overlay. Adds a `POST /__uat/feedback` endpoint
 * to the Vite dev server that writes findings + screenshots to a gitignored
 * `flow-sessions/<date>-<user>/` dir under the consuming app's project root.
 * This is the LOCAL fallback only — staging/clone instances POST to the remote
 * collector (`collector.mjs`, or the Fastify service from Sprint 2).
 *
 * Register behind your own enable flag, e.g.:
 *   plugins: [react(), ...(flowEnabled ? [flowVitePlugin()] : [])]
 */

const ENDPOINT = '/__uat/feedback';
const MAX_BODY = 25 * 1024 * 1024; // 25 MB — screenshots can be large

export interface FlowVitePluginOptions {
  /** Project root to write sessions under. Defaults to the Vite config root / cwd. */
  storageRoot?: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) {
        rej(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => res(data));
    req.on('error', rej);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isoDate(timestamp?: string): string {
  const d = timestamp && /^\d{4}-\d{2}-\d{2}/.test(timestamp) ? timestamp.slice(0, 10) : '';
  return d || new Date().toISOString().slice(0, 10);
}

/**
 * Slugified `git config user.name`, used to make session dirs attributable to a
 * tester (`flow-sessions/<date>-<user>/`). Cached — git user is stable for the
 * session and we don't want to shell out on every finding POST. Falls back to
 * `'unknown'` so the dev server never breaks over this.
 */
let cachedUser: string | undefined;
function gitUser(cwd: string): string {
  if (cachedUser !== undefined) return cachedUser;
  try {
    const name = execSync('git config user.name', { cwd }).toString().trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    cachedUser = slug || 'unknown';
  } catch {
    cachedUser = 'unknown';
  }
  return cachedUser;
}

export function flowVitePlugin(options: FlowVitePluginOptions = {}): Plugin {
  let root = options.storageRoot ?? process.cwd();
  return {
    name: 'flow-feedback-local',
    apply: 'serve', // dev server only
    configResolved(config) {
      if (!options.storageRoot) root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'method not allowed' });
          return;
        }
        try {
          const { finding, pngBase64 } = JSON.parse(await readBody(req)) as {
            finding: Record<string, unknown> & { timestamp?: string };
            pngBase64?: string;
          };
          if (!finding || typeof finding !== 'object') {
            json(res, 400, { error: 'missing finding' });
            return;
          }

          const date = isoDate(finding.timestamp);
          const sessionDir = resolve(root, 'flow-sessions', `${date}-${gitUser(root)}`);
          mkdirSync(resolve(sessionDir, 'shots'), { recursive: true });

          let screenshotFile: string | undefined;
          if (pngBase64) {
            // Filename is server-generated (uuid) — never trust client input.
            screenshotFile = `${randomUUID()}.png`;
            const base64 = pngBase64.replace(/^data:image\/png;base64,/, '');
            writeFileSync(resolve(sessionDir, 'shots', screenshotFile), Buffer.from(base64, 'base64'));
            finding.screenshotFile = screenshotFile;
          }

          appendFileSync(resolve(sessionDir, 'findings.jsonl'), JSON.stringify(finding) + '\n');
          json(res, 200, { screenshotFile });
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : 'write failed' });
        }
      });
    },
  };
}
