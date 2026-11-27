// The device-side queue of crash / error reports (pure: storage and sending
// are passed in, so tests/error-queue.test.cjs runs it without a browser).
// Note: docs/app-error-reports.md.

import type { AppErrorReport } from "~/lib/actions/error-report.actions";

export type QueuedError = AppErrorReport & { sig: string };

type QueueState = {
  pending: QueuedError[];
  /** Signatures sent lately, so a repeating error is not sent again and again. */
  recent: { sig: string; t: number }[];
};

export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const ERROR_QUEUE_KEY = "pos_error_reports";
const MAX_PENDING = 50;
const MAX_RECENT = 100;
const RECENT_MS = 60 * 60 * 1000;
const BATCH = 20;
/** Batches per flush, so one flush can never turn into a loop. */
const MAX_BATCHES = 3;

/** Same error on the same screen = same signature. */
export function errorSignature(e: AppErrorReport): string {
  const top = (e.stack ?? "").split("\n").find((l) => /\bat\b|@/.test(l))?.trim() ?? "";
  return [e.kind ?? "", e.screen ?? "", e.message, top].join("|").slice(0, 500);
}

export function createErrorQueue(
  storage: () => KeyValueStorage | null,
  now: () => number = () => Date.now(),
) {
  let busy = false;
  // After a failed send, wait for the next page load (no retry loop).
  let failedThisLoad = false;

  function read(): QueueState {
    try {
      const raw = storage()?.getItem(ERROR_QUEUE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<QueueState>;
        return {
          pending: Array.isArray(s.pending) ? s.pending : [],
          recent: Array.isArray(s.recent) ? s.recent : [],
        };
      }
    } catch {
      // unreadable or blocked storage: start empty
    }
    return { pending: [], recent: [] };
  }

  function write(s: QueueState) {
    try {
      storage()?.setItem(ERROR_QUEUE_KEY, JSON.stringify(s));
    } catch {
      // full or blocked storage: the report is lost, never the app
    }
  }

  function prune(s: QueueState) {
    const cutoff = now() - RECENT_MS;
    s.recent = s.recent.filter((r) => r.t >= cutoff).slice(-MAX_RECENT);
    s.pending = s.pending.slice(-MAX_PENDING);
  }

  /** Keeps the error unless the same one is already waiting or was sent lately. false = dropped as a duplicate. */
  function add(e: AppErrorReport): boolean {
    const s = read();
    prune(s);
    const sig = errorSignature(e);
    if (s.pending.some((p) => p.sig === sig) || s.recent.some((r) => r.sig === sig)) return false;
    s.pending.push({ ...e, sig });
    prune(s);
    write(s);
    return true;
  }

  /**
   * Sends what is waiting, 20 at a time. `send` answers true only on the ERP's
   * SUCCESS; anything else leaves the errors for the next page load.
   */
  async function flush(send: (batch: AppErrorReport[]) => Promise<boolean>): Promise<void> {
    if (busy || failedThisLoad) return;
    busy = true;
    try {
      for (let i = 0; i < MAX_BATCHES; i++) {
        const batch = read().pending.slice(0, BATCH);
        if (batch.length === 0) return;
        let ok = false;
        try {
          ok = await send(batch.map(({ sig: _sig, ...e }) => e));
        } catch {
          ok = false;
        }
        if (!ok) {
          failedThisLoad = true;
          return;
        }
        const sent = new Set(batch.map((b) => b.sig));
        const s = read();
        s.pending = s.pending.filter((p) => !sent.has(p.sig));
        const t = now();
        sent.forEach((sig) => s.recent.push({ sig, t }));
        prune(s);
        write(s);
      }
    } finally {
      busy = false;
    }
  }

  function pendingCount(): number {
    return read().pending.length;
  }

  return { add, flush, pendingCount };
}

// ---------------------------------------------------------------------------
// What is worth reporting.

export type ErrorSource = "crash" | "uncaught" | "unhandled_rejection";

const NOISE = [
  /ResizeObserver loop/i,
  // Offline till / server unreachable: not a bug in the app.
  /^Network ?Error$/i,
  /^Failed to fetch$/i,
  /^Load failed$/i,
  /NetworkError when attempting to fetch/i,
  /^Authentication required$/,
];

// A deploy replaced the build while this tab still runs the old one.
const CHUNK = [
  /ChunkLoadError/,
  /Loading (CSS )?chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
];

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

function messageOf(reason: unknown): string {
  if (reason instanceof Error) return reason.message || reason.name;
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object") {
    const m = (reason as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
    try {
      return JSON.stringify(reason);
    } catch {
      return String(reason);
    }
  }
  return String(reason);
}

/**
 * The report for an error, or null when it is noise or an answer from the ERP
 * (refusals and validation are already in the ERP's own log).
 */
export function describeError(
  reason: unknown,
  source: ErrorSource,
  screen: string,
  extra: { digest?: string; component_stack?: string } = {},
  at: Date = new Date(),
): AppErrorReport | null {
  if (reason && typeof reason === "object") {
    const r = reason as Record<string, unknown>;
    // axios errors: the ERP answered (refusal) or could not be reached.
    if (r.isAxiosError === true) return null;
    // ERP replies thrown as errors by the screens (ErrorBoundary's ErrorWithDetails).
    if (r.response && typeof r.response === "object") return null;
    // A raw ERP reply used as a rejection reason ({status: "FAILED", message}).
    if (typeof r.status === "string" && /fail/i.test(r.status) && !(reason instanceof Error)) return null;
    if (r.name === "AbortError") return null;
  }
  const message = clip(messageOf(reason).trim(), 1000);
  const stack = reason instanceof Error && typeof reason.stack === "string" ? reason.stack : undefined;
  if (!message) return null;
  if (NOISE.some((re) => re.test(message))) return null;
  // Cross-origin script errors carry nothing to act on.
  if (message === "Script error." && !stack) return null;

  const chunk = CHUNK.some((re) => re.test(message) || re.test((reason as Error)?.name ?? ""));
  let kind: string = chunk ? "chunk_load" : source;
  if (extra.digest) kind += ` (digest ${extra.digest})`;

  const report: AppErrorReport = {
    message,
    screen,
    fatal: source === "crash" && !chunk,
    kind,
    at: at.toISOString(),
  };
  if (stack) report.stack = clip(stack, 3000);
  if (extra.component_stack) report.component_stack = clip(extra.component_stack, 1500);
  return report;
}
