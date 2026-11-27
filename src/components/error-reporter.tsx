"use client";

import { useEffect } from "react";
import { flushErrorReports, installGlobalErrorListeners } from "~/lib/error-reporter";
import { useAuthStore } from "~/store/auth-store";

/** Catches uncaught errors / unhandled rejections and sends kept reports once signed in. Renders nothing. */
export default function ErrorReporter() {
  const token = useAuthStore((s) => s.account?.token);

  useEffect(() => {
    installGlobalErrorListeners();
  }, []);

  // On page load, and again after a sign-in brings a token.
  useEffect(() => {
    if (token) void flushErrorReports();
  }, [token]);

  return null;
}
