"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ContentLayout } from "~/components/common/content-layout";
import { useDiscountRestoration } from "~/hawk-tuah/hooks/useDiscountRestoration";
import { useEnhancedInventory } from "~/hawk-tuah/hooks/useEnhancedInventory";

import { useAuthStore } from "~/store/auth-store";
const ItemSearchBox = dynamic(() => import("~/components/item-searchbox"), {
  ssr: false,
});
const ShoppingCart = dynamic(() => import("~/components/cart"), {
  ssr: false,
});
const CartActions = dynamic(() => import("~/components/cart-actions"), {
  ssr: false,
});

const TotalSummary = dynamic(() => import("~/components/total-summary"), {
  ssr: false,
});

export default function HomePage() {
  const { site_company, account } = useAuthStore();
  const { isInitialized } = useEnhancedInventory();
  const shift = localStorage.getItem("start_shift");
  const roles = localStorage.getItem("roles");
  const router = useRouter();

  useDiscountRestoration();

  useEffect(() => {
    if (site_company && account && !isInitialized) {
      console.log('🎯 Initializing enhanced inventory...');
    }
  }, [site_company, account, isInitialized]);

  useEffect(() => {
    const shift = localStorage.getItem("start_shift");
    const shift_data: CheckInResponse = JSON.parse(shift ?? "{}");

    if (shift_data.user_id === account?.id) {
      router.replace("/");
    } else {
      router.replace("/sign-in");
    }
  }, []);

  useEffect(() => {
    const roles = localStorage.getItem("roles");
    if (roles?.includes("mBranchManager") || roles?.includes("mInventoryManager")) {
      router.replace("/dashboard");
    }
  }, [roles]);

  return (
    <ContentLayout title={site_company?.branch ?? ""}>
      <div className=" sticky top-14 z-10 mb-2 bg-zinc-50 py-2  dark:bg-zinc-900">
        <ItemSearchBox />
        <div className="flex w-full flex-row justify-end py-1 ">
          <p className="font-semi-bold text-xs text-zinc-900">
            Selling as {account?.real_name}
          </p>
        </div>
      </div>
      <div className="no-scrollbar relative flex w-full  flex-col items-start gap-4 overflow-y-hidden md:flex-row">
        <div className="no-scrollbar relative flex w-full flex-col md:w-auto">
          <div className="relative flex-grow">
            <ShoppingCart />
          </div>
          <TotalSummary />
        </div>
        <div className="no-scrollbar sticky top-0 h-full flex-grow overflow-hidden">
          <CartActions />
        </div>
      </div>
    </ContentLayout>
  );
}
