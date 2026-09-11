"use client";
import React, { useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";

import { useCartStore } from "../store/cart-store";
import { useStore } from "~/hooks/use-store";
import { useSidebarToggle } from "~/hooks/use-sidebar-toggle";
import { cartColumns, cn } from "~/lib/utils";
import { CartTable } from "./cart-table";
import { DataTable } from "./data-table";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth-store";
import { enhancedCartColumns } from "~/hawk-tuah/components/cartColumns";

const ShoppingCart = () => {
  const { currentCart, setSelectedCartItem } = useCartStore();
  const { site_company, account } = useAuthStore();
  const router = useRouter();
  const sidebar = useStore(useSidebarToggle, (state) => state);

  useEffect(() => {
    if (site_company === null || site_company === undefined) {
      router.replace("/sign-in");
    }
    if (account === null || account === undefined) {
      router.replace("/sign-in");
    }
  }, [account, site_company]);

  return (
    <Card
      className={cn(
        "no-scrollbar h-[26rem] flex-grow overflow-y-auto",
        sidebar?.isOpen === false
          ? "md:min-w-[48rem] lg:min-w-[40rem]"
          : "md:min-w-[30rem]",
      )}
    >
      <CardContent className="overflow-y-auto">
        <DataTable
          columns={enhancedCartColumns} 
          data={currentCart?.items ?? []}
          filCol="description"
          onRowClick={(rowData) => setSelectedCartItem(rowData)}
        />
      </CardContent>
    </Card>
  );
};

export default ShoppingCart;
