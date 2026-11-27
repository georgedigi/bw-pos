// Browser side of the crash / error reports: keeps each error in localStorage,
// sends the unsent ones to the signed-in ERP (tp=app_error_report).
// Never shows anything and never throws. Note: docs/app-error-reports.md.

import {
  reportClientErrors,
  type AppErrorReport,
  type ErrorReportTarget,
} from "~/lib/actions/error-report.actions";
import { createErrorQueue, describeError, type ErrorSource } from "~/lib/error-queue";
import { useAuthStore } from "~/store/auth-store";

const queue = createErrorQueue(() => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
});

let appVersion: Promise<string | undefined> | null = null;

/** The deployed build (public/version.json, written by the prebuild script). */
function buildVersion(): Promise<string | undefined> {
  appVersion ??= fetch("/version.json", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ build?: number }>) : null))
    .then((v) => (v?.build ? `build-${new Date(v.build).toISOString().slice(0, 16)}` : undefined))
    .catch(() => undefined);
  return appVersion;
}

function deviceId(): string | undefined {
  try {
    return window.localStorage.getItem("pos_device_id") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Where to send: only a v2 ERP sign-in carries a token; otherwise keep the errors. */
function target(): Omit<ErrorReportTarget, "app_version"> | null {
  try {
    const s = useAuthStore.getState();
    const token = s.account?.token;
    const company_url = s.site_info?.company_url;
    if (!token || !company_url || s.without_sign_in_auth) return null;
    return {
      company_url,
      cp: s.site_company?.company_prefix ?? "",
      token,
      device_id: deviceId(),
    };
  } catch {
    return null;
  }
}

/** Sends what is waiting, when signed in. Safe to call any time. */
export async function flushErrorReports(): Promise<void> {
  try {
    if (typeof window === "undefined" || queue.pendingCount() === 0) return;
    const t = target();
    if (!t) return;
    const app_version = await buildVersion();
    await queue.flush((batch: AppErrorReport[]) =>
      reportClientErrors({ ...t, app_version }, batch),
    );
  } catch {
    // never reaches the user
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Keeps an error for the ERP (unless it is noise or an ERP answer) and sends soon. */
export function recordError(
  reason: unknown,
  source: ErrorSource,
  extra: { digest?: string; component_stack?: string } = {},
): void {
  try {
    if (typeof window === "undefined") return;
    const report = describeError(reason, source, window.location.pathname, extra);
    if (!report || !queue.add(report)) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushErrorReports();
    }, 2000);
  } catch {
    // never reaches the user
  }
}

let listening = false;

/** window error / unhandledrejection listeners, installed once per page load. */
export function installGlobalErrorListeners(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("error", (event: ErrorEvent) => {
    // Resource load failures (img / script tags) have no error object or message.
    if (!event.error && !event.message) return;
    recordError(event.error ?? event.message, "uncaught");
  });
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    recordError(event.reason, "unhandled_rejection");
  });
}
