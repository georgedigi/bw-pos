import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
} from "~/components/ui/sheet";
import Image from "next/image";
import dynamic from "next/dynamic";
const Menu = dynamic(() => import("./menu"), { ssr: false });

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
        <SheetHeader>
          <Button
            className="flex items-center justify-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src={"/images/image-192.png"}
                width={50}
                height={50}
                alt="logo"
              />
              <h1 className="text-lg font-bold">DigiSales </h1>
            </Link>
          </Button>
        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
