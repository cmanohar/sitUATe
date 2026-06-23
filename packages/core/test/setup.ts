/**
 * Install a clean in-memory localStorage.
 *
 * Node 25 exposes a global `localStorage` (gated on `--localstorage-file`) that
 * lacks the Web Storage API methods and shadows jsdom's implementation, so
 * `localStorage.clear()` throws. Override it with a spec-shaped stub.
 */
class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length(): number {
    return this.m.size;
  }
  clear(): void {
    this.m.clear();
  }
  getItem(key: string): string | null {
    return this.m.has(key) ? this.m.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, String(value));
  }
  removeItem(key: string): void {
    this.m.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.m.keys())[index] ?? null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemStorage(),
  writable: true,
  configurable: true,
});
