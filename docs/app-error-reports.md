# Crash and error reports

The POS sends its crashes and errors to the ERP it is signed in to (`tp=app_error_report`). The ERP writes them into its
error log, and DigiERP Control shows them on Logs / Issues as **Web POS** and alerts on them. The server contract is
JamiiDairy `docs/ww/mobile/app-error-reports.md`; this note is the POS side.

## What is caught

| Where | `fatal` | `kind` |
|---|---|---|
| Next error boundaries `src/app/error.tsx`, `src/app/(protected)/error.tsx`, `src/app/global-error.tsx` | `true` | `crash`, plus ` (digest <id>)` when Next gives a digest |
| `window` `error` (listener mounted once in `src/app/(root)/layout.tsx`) | `false` | `uncaught` |
| `window` `unhandledrejection` (same) | `false` | `unhandled_rejection` |
| A chunk that failed to load (old tab after a deploy), from any of the above | `false` | `chunk_load` |

`screen` is the path (`window.location.pathname`, no query string), `at` the device time.

**Not reported:** ERP answers (axios errors, errors carrying the ERP `response`, a raw `{status: "FAILED"}` reply as a
rejection reason) - refusals and validation are already in the ERP's own log; network failures (offline till);
`Authentication required`; `ResizeObserver loop`; cross-origin `Script error.` with no stack; `AbortError`.

## How it is sent

- `src/lib/error-queue.ts` (pure, tested by `tests/error-queue.test.cjs`): each error is kept in localStorage
  (`pos_error_reports`) first. The same error (kind + screen + message + top stack frame) waiting or sent in the last hour
  is not kept again. At most 50 wait.
- `src/lib/error-reporter.ts`: sends the waiting ones 2 seconds after an error, on page load and after sign-in, 20 per
  request, at most 3 requests per go. Removed once the ERP answers `SUCCESS`; on any failure they stay and nothing more is
  tried until the next page load. Storage errors and send errors are swallowed; the user never sees anything.
- `src/lib/actions/error-report.actions.ts` `reportClientErrors()`: the request, form-encoded like every other call:
  `tp=app_error_report`, `cp` (company prefix), `app=pos`, `platform=web`, `errors` (JSON text), `app_version`
  (`build-<date>` from `public/version.json`), `device_id` (`pos_device_id` when the sign-in sent one), header
  `Authorization: Bearer <token>`.
- The token is the `token` in the login reply already kept in `auth-storage`. No token (not signed in, a v1 site, or the
  sign-in-free endpoint mode) = nothing is sent; the errors wait until there is one.
