// apps/web/src/lib/store.ts
// Utilidad segura para almacenamiento (localStorage con fallback en memoria)

type Json = any;
const isBrowser = typeof window !== "undefined";

// Fallback en memoria (cuando no hay localStorage)
const mem = new Map<string, string>();

export function getItem(key: string): string | null {
  if (isBrowser && "localStorage" in window) {
    try { return window.localStorage.getItem(key); } catch {}
  }
  return mem.get(key) ?? null;
}

export function setItem(key: string, value: string) {
  if (isBrowser && "localStorage" in window) {
    try { window.localStorage.setItem(key, value); return; } catch {}
  }
  mem.set(key, value);
}

export function removeItem(key: string) {
  if (isBrowser && "localStorage" in window) {
    try { window.localStorage.removeItem(key); return; } catch {}
  }
  mem.delete(key);
}

// === API pedida por DeviceChips.tsx ===
export function load<T = Json>(key: string, fallback?: T): T {
  const raw = getItem(key);
  if (raw == null) return fallback as T;
  try { return JSON.parse(raw) as T; } catch { return (raw as unknown) as T; }
}

export function save<T = Json>(key: string, value: T): void {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  setItem(key, raw);
}

export function update<T = Json>(key: string, modifier:(prev: T | undefined)=>T) {
  const prev = load<T | undefined>(key, undefined);
  const next = modifier(prev);
  save(key, next);
  return next;
}

// Export por defecto opcional (no rompe imports existentes)
export default { load, save, update, getItem, setItem, removeItem };



