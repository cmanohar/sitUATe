/**
 * A deliberately plain demo page (inline styles only — no Tailwind, no design
 * system). Click the "UAT" launcher bottom-left, then flag any element below or
 * "Note this screen". Saved feedback lands in `.situate/sessions/` via the dev
 * collector plugin.
 *
 * `data-uat-redact` marks a region that Situate's always-on redaction will mask in
 * screenshots (Sprint 5) — useful for any field that could carry sensitive data.
 */
const page: React.CSSProperties = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px',
  color: '#111827',
};

const card: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginTop: 20,
};

export function App() {
  return (
    <main style={page}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Situate — example host</h1>
      <p style={{ color: '#6b7280', marginTop: 8 }}>
        This app uses no Tailwind and defines no design tokens. The feedback overlay still renders
        correctly because its styles ship with the package.
      </p>

      <section style={card} data-testid="demo-vitals">
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>A demo card to flag</h2>
        <p style={{ marginTop: 8 }}>
          Open the overlay (bottom-left), choose <strong>select an element</strong>, and click this
          card to attach a graded comment + screenshot.
        </p>
      </section>

      <section style={card} data-uat-redact>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Sensitive region (redaction demo)</h2>
        <p style={{ marginTop: 8 }}>
          This block is marked <code>data-uat-redact</code>. Situate's always-on redaction (Sprint 5)
          will mask it before any screenshot is produced.
        </p>
      </section>
    </main>
  );
}
