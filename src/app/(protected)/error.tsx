'use client';

import { useEffect } from 'react';
import { recordError } from '~/lib/error-reporter';
import { ErrorComponent } from '~/hawk-tuah/ErrorBoundary';

export default function RouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isAuthError = error.message === 'Authentication required';

    // Kept and sent to the ERP (docs/app-error-reports.md); the auth case is skipped there.
    useEffect(() => {
        recordError(error, 'crash', { digest: error.digest });
    }, [error]);

    return <ErrorComponent
        error={error}
        reset={reset}
        isAuthError={isAuthError}
    />;
}