'use client';

import { ErrorComponent } from '~/hawk-tuah/ErrorBoundary';

export default function RouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isAuthError = error.message === 'Authentication required';

    return <ErrorComponent
        error={error}
        reset={reset}
        isAuthError={isAuthError}
    />;
}