"use client";
import AdminPanelLayout from "~/components/admin-panel-layout";
import useAuth from "~/hooks/use-auth";
import { useAuthStore } from "~/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPending } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.is_authenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !isAuthenticated()) {
      router.push("/sign-in"); // Change to your desired route
    }
  }, [isPending, isAuthenticated, router]);
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
