// Share catalogue loads across scan refreshes and both inventory hooks.
export function createCatalogueCache<T>(ttlMs: number) {
  const entries = new Map<string, { value?: T; expires: number; pending?: Promise<T> }>();
  return (key: string, fetch: () => Promise<T>, force = false): Promise<T> => {
    let entry = entries.get(key);
    if (entry?.pending) return entry.pending;
    if (!force && entry?.value !== undefined && entry.expires > Date.now()) {
      return Promise.resolve(entry.value);
    }
    if (!entry) {
      entry = { expires: 0 };
      entries.set(key, entry);
    }
    const current = entry;
    current.pending = Promise.resolve().then(fetch).then((value) => {
      current.value = value;
      current.expires = Date.now() + ttlMs;
      return value;
    }).finally(() => { current.pending = undefined; });
    return current.pending;
  };
}
