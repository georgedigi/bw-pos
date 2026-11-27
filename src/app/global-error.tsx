'use client';

// Shown only when the root layout itself fails (app/error.tsx cannot render then).
import { useEffect } from 'react';
import { recordError } from '~/lib/error-reporter';

export default function RootLayoutError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        recordError(error, 'crash', { digest: error.digest });
    }, [error]);

    return (
        <html lang="en">
            <body style={{ fontFamily: 'sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                    <h2>Something went wrong!</h2>
                    {error.digest && <p style={{ fontFamily: 'monospace', color: '#555' }}>Error Code: {error.digest}</p>}
                    <button onClick={() => reset()} style={{ marginRight: 8 }}>Try Again</button>
                    <button onClick={() => { window.location.href = '/sign-in'; }}>Return to Login</button>
                </div>
            </body>
        </html>
    );
}
