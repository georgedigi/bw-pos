import dynamic from "next/dynamic";
import { useSidebarToggle } from "~/hooks/use-sidebar-toggle";
import { useStore } from "~/hooks/use-store";
import { cn } from "~/lib/utils";
import { SidebarToggle } from "./sidebar-toggle";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "~/store/auth-store";

const Menu = dynamic(() => import("./menu"), { ssr: false });

export function Sidebar() {
  const router = useRouter();
  const { account } = useAuthStore();
  const path = usePathname();
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const [mainLink, setMainLink] = useState<string>("");

  const sft = localStorage.getItem("start_shift");
  const roles = localStorage.getItem("roles");
  const isBranchManager = roles ? roles?.includes("mBranchManager") : false;
  const isInventoryManager = roles ? roles?.includes("mInventoryManager") : false;

  useEffect(() => {
    const shift = localStorage.getItem("start_shift");
    const s: CheckInResponse = JSON.parse(shift!);
    router.refresh();
    if (s?.message === "Success" && s.user_id === account?.id) {
      setMainLink(
        s?.id ? (isBranchManager || isInventoryManager ? "/dashboard" : "/") : "/dashboard",
      );
    } else {
      setMainLink("/dashboard");
    }
  }, [sft, path, account, router, isBranchManager, isInventoryManager]);

  if (!sidebar) return null;
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-20 h-screen -translate-x-full transition-[width] duration-300 ease-in-out lg:translate-x-0",
        sidebar?.isOpen === false ? "w-[90px]" : "w-72",
      )}
    >
      <SidebarToggle isOpen={sidebar?.isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative flex h-full flex-col overflow-y-auto px-3 py-4 shadow-md dark:shadow-zinc-800">
        <Button
          className={cn(
            "mb-1 transition-transform duration-300 ease-in-out",
            sidebar?.isOpen === false ? "translate-x-1" : "translate-x-0",
          )}
          variant="link"
          asChild
        >
          <Link href={mainLink} className="flex items-center gap-2">
            <Image
              src={"/images/image-192.png"}
              width={50}
              height={50}
              alt="logo"
            />
            <h1
              className={cn(
                "whitespace-nowrap text-lg font-bold transition-[transform,opacity,display] duration-300 ease-in-out",
                sidebar?.isOpen === false
                  ? "hidden -translate-x-96 opacity-0"
                  : "translate-x-0 opacity-100",
              )}
            >
              Digisales
            </h1>
          </Link>
        </Button>
        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
