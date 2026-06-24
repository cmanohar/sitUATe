import { useState } from 'react';
import type { SituateGatingConfig } from '@situate/core';

export interface GatingEditorProps {
  env: string;
  value: SituateGatingConfig;
  onSave: (cfg: SituateGatingConfig) => Promise<void> | void;
}

function parseList(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/**
 * Runtime gating editor (D5). Edits the env's flag + allowlist and writes through
 * the collector's config API — flips Situate on/off without a redeploy.
 */
export function GatingEditor({ env, value, onSave }: GatingEditorProps) {
  const [enabled, setEnabled] = useState(value.enabled);
  const [roles, setRoles] = useState(value.allowedRoles.join(', '));
  const [userIds, setUserIds] = useState(value.allowedUserIds.join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ enabled, allowedRoles: parseList(roles), allowedUserIds: parseList(userIds) });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 12, fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
      <legend style={{ fontWeight: 600 }}>Runtime gating — <code>{env}</code></legend>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Allowed roles (comma-separated){' '}
        <input aria-label="allowed roles" value={roles} onChange={(e) => setRoles(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Allowed user IDs (comma-separated){' '}
        <input aria-label="allowed user ids" value={userIds} onChange={(e) => setUserIds(e.target.value)} style={{ width: '100%' }} />
      </label>
      <button type="button" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save gating'}
      </button>
      {saved && <span style={{ marginLeft: 8, color: '#16a34a' }}>Saved</span>}
      <p style={{ color: '#6b7280', marginTop: 8 }}>Empty allowlist = all authenticated users (when enabled).</p>
    </fieldset>
  );
}
