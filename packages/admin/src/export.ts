/**
 * Findings export. Markdown reuses core's `renderReport` (same renderer the CLI
 * uses); CSV is a flat triage-friendly sheet. Both are pure — no I/O.
 */
import { renderReport, type UatFinding } from '@situate/core';

const COLUMNS = [
  'id',
  'timestamp',
  'status',
  'severity',
  'category',
  'route',
  'comment',
  'testerRole',
  'screenshotFile',
] as const;

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  // RFC 4180: quote if it contains comma, quote, or newline; double embedded quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function findingsToCsv(findings: UatFinding[]): string {
  const header = COLUMNS.join(',');
  const rows = findings.map((f) =>
    COLUMNS.map((c) => csvCell((f as unknown as Record<string, unknown>)[c])).join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}

export function findingsToMarkdown(findings: UatFinding[], date: string): string {
  return renderReport(findings, { date });
}

/** Trigger a client-side file download (browser only). */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
