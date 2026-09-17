/** Serialize complete scans so each stock check and cart update finishes in order. */
export function createScanQueue(onPendingChange: (pending: number) => void) {
  let tail = Promise.resolve();
  let pending = 0;
  let disposed = false;

  return {
    get pending() { return pending; },
    enqueue(process: () => Promise<void>) {
      if (disposed) return;
      pending += 1;
      onPendingChange(pending);
      tail = tail.then(async () => {
        if (!disposed) await process();
      }).catch((error: unknown) => {
        // A failed scan must not prevent later scans from being processed.
        console.error("Scan processing failed:", error);
      }).finally(() => {
        pending -= 1;
        if (!disposed) onPendingChange(pending);
      });
    },
    async drain() { await tail; },
    dispose() { disposed = true; },
  };
}
