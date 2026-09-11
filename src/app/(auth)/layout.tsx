import { Suspense } from "react";
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </main>
  );
}
