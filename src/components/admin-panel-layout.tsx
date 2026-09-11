"use client";
import { useSidebarToggle } from "~/hooks/use-sidebar-toggle";
import { useStore } from "~/hooks/use-store";
import { cn } from "~/lib/utils";
import { Sidebar } from "./common/sidebar";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  return (
    <>
      {sidebar.isOpen && <Sidebar />}
      <main
        className={cn(
          "no-scrollbar min-h-[calc(100vh_-_56px)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900",
          sidebar?.isOpen === false ? "lg:ml-[0px]" : "lg:ml-72",
        )}
      >
        {children}
      </main>
    </>
  );
}
