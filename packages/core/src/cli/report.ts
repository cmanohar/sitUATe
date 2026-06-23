#!/usr/bin/env node
/**
 * Flow report generator.
 *
 * Reads captured findings (JSONL) from `flow-sessions/<date>[-<user>]/findings.jsonl`
 * (relative to the current working directory) and renders a markdown findings doc
 * into `docs/reviews/<date>-uat-findings.md`, using the same pure renderer the
 * unit tests cover (`../report`).
 *
 *   flow-report                      # today's session
 *   flow-report --date 2026-06-20
 *   flow-report --all                # merge every session dir
 *   flow-report --source clone
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderReport } from '../report.js';
import type { UatFinding } from '../types.js';

const ROOT = process.cwd();
const SESSIONS_DIR = resolve(ROOT, 'flow-sessions');

interface Args {
  date: string;
  all: boolean;
  source?: string;
}

function parseArgs(argv: string[]): Args {
  const today = new Date().toISOString().slice(0, 10);
  const args: Args = { date: today, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--date') args.date = argv[++i];
    else if (a.startsWith('--date=')) args.date = a.slice('--date='.length);
    else if (a === '--source') args.source = argv[++i];
    else if (a.startsWith('--source=')) args.source = a.slice('--source='.length);
  }
  return args;
}

function readJsonl(file: string): UatFinding[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as UatFinding);
}

function loadFindings(args: Args): UatFinding[] {
  if (!existsSync(SESSIONS_DIR)) return [];
  if (args.all) {
    return readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => readJsonl(resolve(SESSIONS_DIR, d.name, 'findings.jsonl')));
  }
  // Session dirs are `<date>-<user>` (per-tester); merge every dir for the date.
  // Plain `<date>` dirs (pre-username sessions) still match exactly for back-compat.
  return readdirSync(SESSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (d.name === args.date || d.name.startsWith(`${args.date}-`)))
    .flatMap((d) => readJsonl(resolve(SESSIONS_DIR, d.name, 'findings.jsonl')));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const findings = loadFindings(args);
  const md = renderReport(findings, { date: args.date, source: args.source });

  const outDir = resolve(ROOT, 'docs', 'reviews');
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `${args.date}-uat-findings.md`);
  writeFileSync(outFile, md);

  const rel = outFile.slice(ROOT.length + 1);
  console.log(`Flow report: ${findings.length} finding(s) → ${rel}`);
}

main();
