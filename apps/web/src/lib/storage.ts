// src/lib/storage.ts
const PREFIX = "nurseos:";
export const storeSet = (key: string, value: unknown) =>
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
export const storeGet = <T = unknown>(key: string, fallback: T): T =>
  JSON.parse(localStorage.getItem(PREFIX + key) || JSON.stringify(fallback));
