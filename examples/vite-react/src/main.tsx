import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { situate } from '@situate/widget';
// The widget's self-contained styles. The host defines no design tokens of its
// own — everything the overlay needs travels with this import.
import '@situate/widget/styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Two-layer gating (Sprint 3):
//   • Build-time flag → dead-code-eliminates the overlay when off (kept here).
//   • Runtime → situate(config) consults the collector and matches the user against
//     the allowlist; fail-closed in non-dev. This example runs dev mode (no
//     collectorUrl), so the overlay stays on and posts to the Vite sink.
//
// A real, collector-backed host would pass identity + env:
//   situate({
//     collectorUrl: import.meta.env.VITE_SITUATE_COLLECTOR_URL,
//     auth: { userId: me.id, roles: me.roles, isAdmin: me.isAdmin },
//     environment: import.meta.env.MODE,
//   });
if (import.meta.env.VITE_SITUATE_ENABLED !== 'false') {
  situate({ collectorUrl: import.meta.env.VITE_SITUATE_COLLECTOR_URL });
}
