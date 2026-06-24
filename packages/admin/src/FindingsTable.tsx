import type { CSSProperties } from 'react';
import type { SituateFindingStatus, UatFinding } from '@situate/core';

/** The triage status vocabulary (mirrors SituateFindingStatus). */
export const STATUSES: SituateFindingStatus[] = [
  'new',
  'triaged',
  'planned',
  'in-progress',
  'shipped',
  'declined',
  'duplicate',
];

export interface FindingsTableProps {
  findings: UatFinding[];
  onSetStatus: (id: string, status: SituateFindingStatus) => void;
  onView?: (finding: UatFinding) => void;
}

const cell: CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', verticalAlign: 'top' };
const th: CSSProperties = { ...cell, fontWeight: 600, borderBottom: '2px solid #d1d5db', whiteSpace: 'nowrap' };

function firstLine(s: string): string {
  return s.split(/\r?\n/)[0];
}

/**
 * Presentational findings table (reusability primitive — no data fetching, no
 * filtering). Renders rows with an inline status selector and a screenshot link.
 */
export function FindingsTable({ findings, onSetStatus, onView }: FindingsTableProps) {
  if (findings.length === 0) {
    return <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No findings match the current filters.</p>;
  }
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
      <thead>
        <tr>
          <th style={th}>Severity</th>
          <th style={th}>Route</th>
          <th style={th}>Finding</th>
          <th style={th}>Category</th>
          <th style={th}>Tester</th>
          <th style={th}>Status</th>
          <th style={th}>Shot</th>
        </tr>
      </thead>
      <tbody>
        {findings.map((f) => (
          <tr key={f.id}>
            <td style={cell}>{f.severity}</td>
            <td style={cell}><code>{f.route}</code></td>
            <td style={{ ...cell, maxWidth: 360 }}>{firstLine(f.comment)}</td>
            <td style={cell}>{f.category ?? '—'}</td>
            <td style={cell}>{f.testerRole ?? '—'}</td>
            <td style={cell}>
              <select
                aria-label={`status for ${f.id}`}
                value={f.status ?? 'new'}
                onChange={(e) => onSetStatus(f.id, e.target.value as SituateFindingStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </td>
            <td style={cell}>
              {f.screenshotFile ? (
                <button type="button" onClick={() => onView?.(f)}>view</button>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
