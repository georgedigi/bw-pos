'use client';

import { ErrorComponent } from '~/hawk-tuah/ErrorBoundary';

export default function GlobalError({
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