/**
 * SPA-aware route tracking for the Flow overlay.
 *
 * The overlay mounts globally (a sibling of the host's router), so it cannot use
 * react-router's `useLocation()`. SPA routers navigate via `history.pushState`,
 * which does NOT fire `popstate` — so we patch `pushState`/`replaceState` to
 * emit a custom event and listen for both.
 */

const LOCATION_EVENT = 'uat:locationchange';

type HistoryFn = History['pushState'];

export function getCurrentRoute(): string {
  return window.location.pathname + window.location.search;
}

/**
 * Patch history + add listeners so `onChange` fires on every navigation
 * (SPA pushState/replaceState and browser back/forward). Returns a cleanup
 * that restores the original history methods and removes the listeners.
 */
export function installLocationTracking(onChange: () => void): () => void {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  const wrap = (fn: HistoryFn): HistoryFn =>
    function patched(this: History, ...args: Parameters<HistoryFn>) {
      const result = fn.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_EVENT));
      return result;
    };

  history.pushState = wrap(originalPush);
  history.replaceState = wrap(originalReplace);

  window.addEventListener('popstate', onChange);
  window.addEventListener(LOCATION_EVENT, onChange);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
}
