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

// Build-time gate (default on for the example). In a real app:
//   if (import.meta.env.VITE_SITUATE_ENABLED === 'true') situate();
if (import.meta.env.VITE_SITUATE_ENABLED !== 'false') {
  situate();
}
