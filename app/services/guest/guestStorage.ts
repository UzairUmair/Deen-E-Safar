// Versioned, validated localStorage for Guest Mode. Every guest feature persists through a
// store created here; components never touch localStorage themselves. When accounts arrive,
// an authenticated adapter can implement the same Store interface, and `exportGuestData`
// is the hand-off point for a consented migration.

import { GUEST_PREFIX, migrateLegacyData } from "./legacyMigration";

export { GUEST_PREFIX };

export type Store<T> = {
  key: string;
  get(): T;
  /** Returns false when the browser refused the write (quota, private mode). */
  set(next: T | ((current: T) => T)): boolean;
  reset(): void;
  subscribe(listener: () => void): () => void;
  getServerSnapshot(): T;
};

type Definition<T> = {
  name: string;
  version: number;
  defaults: () => T;
  /** Returns clean data, or null when the stored value cannot be trusted. */
  validate: (data: unknown) => T | null;
};

const registry: { key: string; invalidate: () => void }[] = [];
let listening = false;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // access can throw when storage is blocked
  }
}

export function createStore<T>({ name, version, defaults, validate }: Definition<T>): Store<T> {
  const key = GUEST_PREFIX + name;
  const fallback = defaults();
  const listeners = new Set<() => void>();
  let cached: T | undefined;

  function read(): T {
    const target = storage();
    if (target) migrateLegacyData(target);
    const raw = target?.getItem(key);
    if (raw == null) return fallback;
    try {
      const envelope = JSON.parse(raw);
      const data = envelope && typeof envelope === "object" && envelope.v === version ? validate(envelope.data) : null;
      if (data !== null) return data;
    } catch {
      /* fall through to recovery */
    }
    // Corrupt or from an unknown schema version: discard it rather than guess.
    try {
      storage()?.removeItem(key);
    } catch {}
    return fallback;
  }

  const invalidate = () => {
    cached = undefined;
    listeners.forEach((listener) => listener());
  };
  registry.push({ key, invalidate });

  const store: Store<T> = {
    key,
    get() {
      if (cached === undefined) cached = read();
      return cached;
    },
    set(next) {
      const value = typeof next === "function" ? (next as (current: T) => T)(store.get()) : next;
      try {
        const target = storage();
        if (!target) return false;
        target.setItem(key, JSON.stringify({ v: version, data: value }));
      } catch {
        return false;
      }
      cached = value;
      listeners.forEach((listener) => listener());
      return true;
    },
    reset() {
      try {
        storage()?.removeItem(key);
      } catch {}
      invalidate();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (!listening && typeof window !== "undefined") {
        listening = true;
        // Another tab changed (or cleared) guest data.
        window.addEventListener("storage", (event) => {
          for (const store of registry) if (event.key === null || event.key === store.key) store.invalidate();
        });
      }
      return () => {
        listeners.delete(listener);
      };
    },
    getServerSnapshot: () => fallback,
  };
  return store;
}

const isOurs = (key: string) => key.startsWith("deen-") || key.startsWith("note-");

/** Everything this site has saved in the browser, as raw strings (backup / future account migration). */
export function exportGuestData(): Record<string, string> {
  const target = storage();
  const data: Record<string, string> = {};
  if (!target) return data;
  for (let i = 0; i < target.length; i++) {
    const key = target.key(i)!;
    if (isOurs(key) && !key.startsWith("deen-reminder-fired")) data[key] = target.getItem(key)!;
  }
  return data;
}

/** Replaces all saved data with `entries`; restores the previous data if any write fails. */
export function replaceGuestData(entries: Record<string, string>) {
  const target = storage();
  if (!target) throw new Error("Storage unavailable");
  const previous = Object.fromEntries(Object.keys(target).filter(isOurs).map((key) => [key, target.getItem(key)!]));
  try {
    for (const key of Object.keys(previous)) target.removeItem(key);
    for (const [key, value] of Object.entries(entries)) target.setItem(key, value);
  } catch (error) {
    for (const key of Object.keys(entries)) target.removeItem(key);
    for (const [key, value] of Object.entries(previous)) target.setItem(key, value);
    throw error;
  } finally {
    registry.forEach((store) => store.invalidate());
  }
}

/** Removes every key this site owns, including pre-v2 ones. */
export function clearGuestData() {
  const target = storage();
  if (!target) return;
  for (const key of Object.keys(target)) if (isOurs(key)) target.removeItem(key);
  registry.forEach((store) => store.invalidate());
}
