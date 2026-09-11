import "~/styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import "@fontsource/courier-prime";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "~/components/ui/sonner";
// import { Inter as FontSans } from "next/font/google";

import type { Viewport } from "next";

import Providers from "~/providers/providers";
import { AuthErrorBoundary } from "~/hawk-tuah/ErrorBoundary";

// const fontSans = FontSans({
//   subsets: ["latin"],
//   variable: "--font-sans",
// });

export const metadata = {
  manifest: "/manifest.json",
  title: "DigiSales POS",
  description: "A DigiERP Point of Sale solution",
};

export const viewport: Viewport = {
  themeColor: "#EB1F25",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <html lang="en" className={`${GeistSans.variable}`}>
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        {/* <body
        className={cn(
          "bg-background min-h-screen font-sans antialiased",
          fontSans.variable,
        )}
      > */}
      <AuthErrorBoundary>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </AuthErrorBoundary>
        <Toaster richColors />
      </body>
    </html>
  );
}
