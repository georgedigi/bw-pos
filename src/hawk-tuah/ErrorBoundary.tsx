'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '~/components/ui/card';
import { useAuthStore } from '~/store/auth-store';

interface ErrorWithDetails extends Error {
    digest?: string;
    code?: string;
    reason?: string;
    response?: {
        Message?: string;
        message?: string;
        reason?: string;
        status?: string;
    };
}

// Error Component
export function ErrorComponent({
    error,
    reset,
    isAuthError = false
}: {
    error: ErrorWithDetails;
    reset?: () => void;
    isAuthError?: boolean;
}) {
    // Function to extract error message from various formats
    const getErrorMessage = (error: ErrorWithDetails): string => {
        if (error.message === 'Authentication required') {
            return 'Your session has expired. Please sign in again.';
        }

        // Check response object
        if (error.response) {
            return error.response.Message ||
                error.response.message ||
                error.response.reason ||
                (error.response.status === 'failed' ? 'Operation failed' : '');
        }

        return error.reason ||
            error.message ||
            'An unexpected error occurred';
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <Card className="mx-auto max-w-md">
                <CardHeader>
                    <div className="flex flex-row items-center justify-center">
                        <Image
                            src="/images/image-192.png"
                            alt="Digisales Logo"
                            width={80}
                            height={80}
                            priority
                        />
                    </div>

                    <CardTitle className="text-2xl text-center">Digisales</CardTitle>
                    <CardDescription className="text-center">
                        {isAuthError ? 'Authentication Required' : 'Something went wrong!'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="grid gap-4">
                        <div className="space-y-2 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="bg-red-100 p-3 rounded-full">
                                    <AlertCircle className="h-12 w-12 text-red-500" />
                                </div>
                            </div>

                            <p className="text-gray-600">
                                {getErrorMessage(error)}
                            </p>

                            {error.digest && (
                                <div className="bg-gray-50 py-2 px-4 rounded-md mt-4">
                                    <span className="font-mono text-sm text-gray-600">
                                        Error Code: {error.digest}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-4">
                            <Button
                                className="w-full"
                                onClick={() => {
                                    if (isAuthError) {
                                        localStorage.removeItem('auth-storage');
                                    }
                                    window.location.href = '/sign-in';
                                }}
                            >
                                <Home className="h-4 w-4 mr-2" />
                                {isAuthError ? 'Sign In Again' : 'Return to Login'}
                            </Button>

                            {!isAuthError && reset && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => reset()}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            )}
                        </div>

                        <div className="text-sm text-gray-500 text-center pt-4">
                            <p>
                                If the problem persists, please contact our support team at{' '}
                                <a
                                    href="mailto:support@digisales.co.ke"
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    support@digisales.co.ke
                                </a>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Auth Error Boundary Component
export function AuthErrorBoundary({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { site_company, clear_auth_session } = useAuthStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        let mounted = true;

        const handleAuthError = () => {
            if (!mounted) return;

            const isLoginPage = pathname.includes('/sign-in');
            const hasAuth = localStorage.getItem('auth-storage') !== null;

            if (!isLoginPage && hasAuth && !site_company?.company_prefix) {
                clear_auth_session();
                router.push("/sign-in");
                toast.error("Session expired. Please sign in again.");
            }
        };

        const timer = setTimeout(handleAuthError, 1000);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [isClient, site_company, router, clear_auth_session, pathname]);

    // Allow rendering on login page
    if (pathname.includes('/sign-in')) {
        return <>{children}</>;
    }

    // Only check auth state on client side
    if (!isClient) {
        return null;
    }

    const hasAuthData = localStorage.getItem('auth-storage') !== null;
    if (!hasAuthData) {
        router.push('/sign-in');
        return null;
    }

    if (!site_company?.company_prefix) {
        return <ErrorComponent
            error={new Error('Authentication required')}
            isAuthError={true}
        />;
    }

    return <>{children}</>;
}