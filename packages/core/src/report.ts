import type { UatFinding, UatSeverity } from './types.js';

/**
 * Pure findings → markdown renderer. No I/O, no clocks — the date is passed in
 * so output is deterministic (the CLI in `src/cli/report.ts` supplies it).
 * Output matches the SerenityEMR review/feedback doc format.
 */

export interface ReportMeta {
  date: string;
  source?: string;
}

const SEVERITY_ORDER: UatSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const SEVERITY_PREFIX: Record<UatSeverity, string> = {
  Critical: 'C',
  High: 'H',
  Medium: 'M',
  Low: 'L',
};
const ACTION: Record<string, string> = {
  bug: 'Fix',
  change: 'Change',
  question: 'Clarify',
};

function cell(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function firstLine(comment: string): string {
  return comment.split(/\r?\n/)[0].trim();
}

function summaryRow(f: UatFinding): string {
  const evidence = f.screenshotFile
    ? `\`${f.screenshotFile}\``
    : f.selector?.textSnippet ?? '—';
  const action = (f.category && ACTION[f.category]) ?? 'Review';
  const owner = f.testerRole === 'hcp' ? 'Clinical / Eng' : 'Engineering';
  return `| ${cell(f.route)} | ${cell(firstLine(f.comment))} | ${f.severity} | ${cell(evidence)} | ${action} | ${owner} |`;
}

function reproBlock(f: UatFinding): string {
  const lines = [
    `route: ${f.route}`,
    `url: ${f.url}`,
    `scope: ${f.scope}`,
  ];
  if (f.selector?.cssPath) lines.push(`cssPath: ${f.selector.cssPath}`);
  if (f.selector?.testId) lines.push(`testId: ${f.selector.testId}`);
  if (f.selector?.ariaLabel) lines.push(`ariaLabel: ${f.selector.ariaLabel}`);
  if (f.selector?.textSnippet) lines.push(`text: ${JSON.stringify(f.selector.textSnippet)}`);
  if (f.boundingBox) {
    const b = f.boundingBox;
    lines.push(`boundingBox: ${b.x},${b.y} ${b.width}x${b.height}`);
  }
  lines.push(
    `viewport: ${f.viewport.width}x${f.viewport.height} @${f.viewport.devicePixelRatio}x`,
  );
  if (f.screenshotFile) lines.push(`screenshot: ${f.screenshotFile}`);
  return ['```repro', ...lines, '```'].join('\n');
}

function detailSection(f: UatFinding, id: string): string {
  const parts = [
    `### ${id} — ${firstLine(f.comment)}`,
    '',
    `- **Route:** \`${f.route}\``,
    `- **Severity:** ${f.severity}`,
  ];
  if (f.category) parts.push(`- **Category:** ${f.category}`);
  if (f.testerRole) parts.push(`- **Tester:** ${f.testerRole}`);
  if (f.comment !== firstLine(f.comment)) {
    parts.push('', f.comment.trim());
  }
  parts.push('', '**Repro / AI-fix context:**', '', reproBlock(f));
  return parts.join('\n');
}

export function renderReport(findings: UatFinding[], meta: ReportMeta): string {
  const out: string[] = [`# UAT Findings — ${meta.date}`, ''];

  if (findings.length === 0) {
    out.push('> No findings recorded for this session.');
    return out.join('\n') + '\n';
  }

  const sessionCount = new Set(findings.map((f) => f.sessionId)).size;
  const sourceNote = meta.source ? ` from \`${meta.source}\`` : '';
  out.push(
    `> ${findings.length} finding${findings.length === 1 ? '' : 's'}` +
      ` across ${sessionCount} session${sessionCount === 1 ? '' : 's'}${sourceNote}.`,
    '>',
    '> Screenshots are stored privately and referenced by filename; links resolve only on the capturing machine.',
    '',
    '## Summary',
    '',
    '| Area | Finding | Severity | Evidence/Quote | Proposed Action | Owner |',
    '|------|---------|----------|----------------|-----------------|-------|',
  );
  for (const f of findings) out.push(summaryRow(f));
  out.push('');

  for (const severity of SEVERITY_ORDER) {
    const group = findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    out.push(`## ${severity.toUpperCase()}`, '');
    group.forEach((f, i) => {
      out.push(detailSection(f, `${SEVERITY_PREFIX[severity]}-${i + 1}`), '');
    });
  }

  return out.join('\n').replace(/\n+$/, '\n');
}
