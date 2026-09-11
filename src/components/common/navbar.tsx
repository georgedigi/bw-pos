"use client";
import { MenuIcon } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { SheetMenu } from "./sheet-menu";
// import { UserNav } from "./user-nav";
import { useSidebarToggle } from "~/hooks/use-sidebar-toggle";
import { useStore } from "~/hooks/use-store";
import dynamic from "next/dynamic";
import { useAuthStore } from "~/store/auth-store";
const UserNav = dynamic(() => import("./user-nav"), { ssr: false });

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const { account } = useAuthStore();
  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 flex h-14 items-center space-x-3 sm:mx-8">
        {!sidebar?.isOpen && (
          <div className="hidden md:flex" onClick={() => sidebar?.setIsOpen()}>
            <MenuIcon className="h-6 w-6  text-zinc-600" />
          </div>
        )}
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className="font-bold">
            {title} - {account?.default_store_name}
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
