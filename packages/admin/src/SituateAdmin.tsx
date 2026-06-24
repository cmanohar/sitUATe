import { useEffect, useMemo, useState } from 'react';
import type {
  SituateAuthContext,
  SituateGatingConfig,
  UatFinding,
  UatSeverity,
} from '@situate/core';
import { getConfig, setConfig, fetchScreenshot, type AdminClientOptions } from './client.js';
import { useFindings } from './useFindings.js';
import { FindingsTable } from './FindingsTable.js';
import { GatingEditor } from './GatingEditor.js';
import { findingsToCsv, findingsToMarkdown, downloadText } from './export.js';

export interface SituateAdminProps {
  /** Host-supplied identity; the route renders only for `isAdmin`. */
  auth: SituateAuthContext;
  collectorUrl: string;
  /** Admin token the host hands to authenticated admins (sent as `x-situate-admin-token`). */
  adminToken?: string;
  /** Environment whose gating config the editor manages. Default `'production'`. */
  environment?: string;
}

const SEVERITIES: UatSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['bug', 'change', 'question'] as const;

/** Screenshot modal — fetches the blob with the admin header, renders an object URL. */
function ScreenshotModal({ client, finding, onClose }: { client: AdminClientOptions; finding: UatFinding; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    void fetchScreenshot(client, finding.screenshotFile!).then((blob) => {
      if (cancelled) return;
      if (!blob) return setFailed(true);
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [client, finding]);

  return (
    <div
      role="dialog"
      aria-label="screenshot"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 12, borderRadius: 8, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
        {failed ? <p>Screenshot unavailable.</p> : url ? <img src={url} alt="finding screenshot" style={{ maxWidth: '100%' }} /> : <p>Loading…</p>}
        <div style={{ marginTop: 8 }}><button type="button" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/**
 * Embeddable admin/triage route (D4/D8). Host mounts it behind its own routing and
 * supplies identity; non-admins are blocked client-side (and the collector enforces
 * the admin token server-side). Reviews findings, sets status, views screenshots,
 * exports, and edits runtime gating.
 */
export function SituateAdmin({ auth, collectorUrl, adminToken, environment = 'production' }: SituateAdminProps) {
  const client = useMemo<AdminClientOptions>(() => ({ collectorUrl, adminToken }), [collectorUrl, adminToken]);
  const { findings, loading, error, setStatus } = useFindings(client);

  const [severity, setSeverity] = useState<UatSeverity | ''>('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatusFilter] = useState<string>('');
  const [viewing, setViewing] = useState<UatFinding | null>(null);
  const [gating, setGating] = useState<SituateGatingConfig | null>(null);

  useEffect(() => {
    if (!auth.isAdmin) return;
    let cancelled = false;
    void getConfig(client, environment)
      .then((c) => !cancelled && setGating(c))
      .catch(() => !cancelled && setGating(null));
    return () => {
      cancelled = true;
    };
  }, [client, environment, auth.isAdmin]);

  const filtered = useMemo(
    () =>
      findings.filter(
        (f) =>
          (!severity || f.severity === severity) &&
          (!category || f.category === category) &&
          (!status || (f.status ?? 'new') === status),
      ),
    [findings, severity, category, status],
  );

  if (!auth.isAdmin) {
    return <p style={{ fontFamily: 'system-ui, sans-serif' }}>You don’t have access to Situate admin.</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#111827' }}>
      <h2 style={{ marginTop: 0 }}>Situate — Findings triage</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label>Severity{' '}
          <select aria-label="filter severity" value={severity} onChange={(e) => setSeverity(e.target.value as UatSeverity | '')}>
            <option value="">all</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Category{' '}
          <select aria-label="filter category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">all</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Status{' '}
          <select aria-label="filter status" value={status} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">all</option>
            {['new', 'triaged', 'planned', 'in-progress', 'shipped', 'declined', 'duplicate'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => downloadText(`situate-${today}.csv`, findingsToCsv(filtered), 'text/csv')}>Export CSV</button>
        <button type="button" onClick={() => downloadText(`situate-${today}.md`, findingsToMarkdown(filtered, today), 'text/markdown')}>Export Markdown</button>
      </div>

      {loading && <p>Loading findings…</p>}
      {error && <p style={{ color: '#dc2626' }}>Couldn’t load findings: {error}</p>}
      {!loading && !error && (
        <FindingsTable findings={filtered} onSetStatus={(id, s) => void setStatus(id, s)} onView={setViewing} />
      )}

      <div style={{ marginTop: 20 }}>
        {gating && <GatingEditor env={environment} value={gating} onSave={(cfg) => setConfig(client, environment, cfg)} />}
      </div>

      {viewing && <ScreenshotModal client={client} finding={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
