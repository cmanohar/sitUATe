import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { mountFlow } from '@cmanohar/flow-feedback';
// The widget's self-contained styles. The host defines no design tokens of its
// own — everything the overlay needs travels with this import.
import '@cmanohar/flow-feedback/styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Build-time gate (default on for the example). In a real app:
//   if (import.meta.env.VITE_FLOW_ENABLED === 'true') mountFlow();
if (import.meta.env.VITE_FLOW_ENABLED !== 'false') {
  mountFlow();
}
