import { describe, it, expect, vi, afterEach } from 'vitest';
import { installLocationTracking, getCurrentRoute } from '../src/location';

afterEach(() => {
  history.pushState({}, '', '/');
});

describe('getCurrentRoute', () => {
  it('returns pathname + search', () => {
    history.pushState({}, '', '/patients/abc?tab=labs');
    expect(getCurrentRoute()).toBe('/patients/abc?tab=labs');
  });
});

describe('installLocationTracking', () => {
  it('fires onChange when react-router calls history.pushState', () => {
    const onChange = vi.fn();
    const cleanup = installLocationTracking(onChange);
    history.pushState({}, '', '/dashboard');
    expect(onChange).toHaveBeenCalled();
    cleanup();
  });

  it('fires onChange on browser back/forward (popstate)', () => {
    const onChange = vi.fn();
    const cleanup = installLocationTracking(onChange);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onChange).toHaveBeenCalled();
    cleanup();
  });

  it('restores the original history methods on cleanup (no leak)', () => {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    const cleanup = installLocationTracking(() => {});
    expect(history.pushState).not.toBe(originalPush);
    cleanup();
    expect(history.pushState).toBe(originalPush);
    expect(history.replaceState).toBe(originalReplace);
  });

  it('stops firing onChange after cleanup', () => {
    const onChange = vi.fn();
    const cleanup = installLocationTracking(onChange);
    cleanup();
    history.pushState({}, '', '/after');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
