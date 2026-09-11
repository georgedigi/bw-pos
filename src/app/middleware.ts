import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Check for auth data in cookies
    const hasAuth = request.cookies.has('auth-storage');

    // Is this the login page?
    const isLoginPage = path.includes('/sign-in');

    // Protect all routes except login and public assets
    if (!isLoginPage && !hasAuth && !path.includes('_next') && !path.includes('public')) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Redirect to dashboard if trying to access login while authenticated
    if (isLoginPage && hasAuth) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};