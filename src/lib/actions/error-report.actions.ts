// Crash / error reports to the ERP (tp=app_error_report).
// Contract: JamiiDairy docs/ww/mobile/app-error-reports.md; note: docs/app-error-reports.md.

import axios from "axios";

/** One error as the ERP takes it. */
export type AppErrorReport = {
  message: string;
  stack?: string;
  component_stack?: string;
  screen?: string;
  fatal?: boolean;
  kind?: string;
  /** ISO 8601, when it happened on this device. */
  at?: string;
};

export type ErrorReportTarget = {
  company_url: string;
  cp: string;
  token: string;
  app_version?: string;
  device_id?: string;
};

/** The ERP takes at most 20 errors per request. */
export const MAX_ERRORS_PER_REPORT = 20;

/**
 * Sends up to 20 errors. true only when the ERP answered SUCCESS.
 * Never throws: a failure to report must never reach the user.
 */
export async function reportClientErrors(
  target: ErrorReportTarget,
  errors: AppErrorReport[],
): Promise<boolean> {
  if (!target.company_url || !target.token || errors.length === 0) return false;
  try {
    const form = new FormData();
    form.append("tp", "app_error_report");
    form.append("cp", target.cp);
    form.append("app", "pos");
    form.append("platform", "web");
    form.append("errors", JSON.stringify(errors.slice(0, MAX_ERRORS_PER_REPORT)));
    if (target.app_version) form.append("app_version", target.app_version);
    if (target.device_id) form.append("device_id", target.device_id);

    const response = await axios.postForm<{ status?: string }>(
      `${target.company_url}process.php`,
      form,
      {
        headers: { Authorization: `Bearer ${target.token}` },
        timeout: 15000,
      },
    );
    return response.data?.status === "SUCCESS";
  } catch {
    return false;
  }
}
