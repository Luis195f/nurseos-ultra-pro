// apps/web/src/lib/store.ts
export const STORE_KEYS = {
  PATIENT_REGISTRY: "patient-registry",
  CODE_BLUE: "code-blue",
  DECEASED: "deceased"
} as const;


export type StoreKey = (typeof STORE_KEYS)[keyof typeof STORE_KEYS];

export function loadLS<T>(key: StoreKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS<T>(key: StoreKey, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op */
  }
}

export function appendLS<T>(key: StoreKey, item: T) {
  const current = loadLS<T[]>(key, []);
  current.push(item);
  saveLS(key, current);
}

export function updateAtLS<T>(
  key: StoreKey,
  predicate: (x: T) => boolean,
  updater: (x: T) => T
) {
  const current = loadLS<T[]>(key, []);
  const next = current.map((x) => (predicate(x) ? updater(x) : x));
  saveLS(key, next);
}


