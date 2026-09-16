"use client";

import { useBuildVersion } from "~/hooks/useBuildVersion";

/**
 * Tells the cashier a newer build is waiting, and reloads only when they say so.
 *
 * It never reloads on its own: a till can be mid-sale with a cart open, and
 * throwing that away to pick up a fix would be worse than running the old
 * build for another ten minutes. Sitting at the bottom keeps it clear of the
 * scan field at the top.
 */
export default function UpdateAvailableBanner() {
  const { updateAvailable, reload } = useBuildVersion();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2.5 shadow-lg dark:border-amber-400/30 dark:bg-amber-950"
    >
      <span className="text-sm text-amber-900 dark:text-amber-100">
        A system update is ready. Finish the sale you are on, then reload.
      </span>
      <button
        onClick={reload}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
      >
        Reload now
      </button>
    </div>
  );
}
