"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects that a newer build has been deployed while this till has been open.
 *
 * Tills stay open for a whole trading day. Next.js serves content-hashed
 * chunks, so a tab opened before a deploy keeps running the old JavaScript
 * until someone reloads it — a fix can be live for hours while every branch is
 * still on yesterday's code. That is exactly what happened on 16 Sep: the scan
 * fixes went out at 22:50 the night before and the branches never picked them
 * up.
 *
 * `public/version.json` is rewritten on every build (see the `prebuild` script
 * in package.json). We read it once at startup and then poll it; when the value
 * changes, a newer build exists.
 *
 * Deliberately conservative: this never reloads by itself. A till may be in the
 * middle of a sale, so it only reports that an update is waiting and leaves the
 * decision to the cashier.
 */

const VERSION_URL = "/version.json";
const POLL_MS = 5 * 60 * 1000; // five minutes is plenty; deploys are rare

async function readDeployedBuild(): Promise<string | null> {
  try {
    // no-store, and a cache-buster, or the CDN will happily hand back the
    // version this tab already has.
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { build?: string | number };
    return body?.build != null ? String(body.build) : null;
  } catch {
    // Offline or the file is missing: not an error worth surfacing at a till.
    return null;
  }
}

export function useBuildVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const loadedBuild = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const deployed = await readDeployedBuild();
      if (cancelled || deployed === null) return;

      if (loadedBuild.current === null) {
        loadedBuild.current = deployed; // first read: this is what we are running
        return;
      }
      if (deployed !== loadedBuild.current) setUpdateAvailable(true);
    };

    void check();
    const timer = setInterval(() => void check(), POLL_MS);

    // Cashiers leave the till idle for long stretches; check again when they
    // come back to it rather than waiting out the interval.
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return {
    updateAvailable,
    reload: () => window.location.reload(),
  };
}
