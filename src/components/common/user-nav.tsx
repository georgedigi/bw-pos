"use client";

import Link from "next/link";
import { LayoutGrid, LogOut, User } from "lucide-react";

import { Button } from "~/components/ui/button";
import { deleteMetadata } from "~/utils/indexeddb";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAuthStore } from "~/store/auth-store";
import { useRouter } from "next/navigation";
import { useCartStore } from "~/store/cart-store";
import { toast } from "sonner";
import { useState } from "react";
import { submit_hold_direct_sale_request } from "~/lib/actions/user.actions";
import { SYSTEM_HOLD_REASONS } from "~/lib/utils";

export default function UserNav() {
  const { account, clear_auth_session, site_url, site_company } =
    useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const { currentCart, currentCustomer, holdCart } = useCartStore(
    (state) => state,
  );
  const roles = localStorage.getItem("roles");
  const isBranchManager = roles ? roles?.includes("mBranchManager") : false;
  const router = useRouter();

  const handleHoldCart = async (systemReason?: typeof SYSTEM_HOLD_REASONS[keyof typeof SYSTEM_HOLD_REASONS]) => {
    if (!currentCart) {
      toast.error("Please add items to cart");
      // setIsLoading(false);
      return;
    }
    if (!currentCustomer) {
      toast.error("Please select a customer");
      // setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await submit_hold_direct_sale_request(
        site_url!,
        site_company!.company_prefix,
        account!.id,
        account!.user_id,
        currentCart.items,
        currentCustomer,
        null,
        currentCustomer.br_name,
        currentCart.cart_id,
        systemReason,
      );
      console.log("result", result);
      if (!result) {
        // sentry.captureException(result);
        toast.error("Hold  Action failed");
        setIsLoading(false);
        return false;
      }

      holdCart();

      toast.success("Cart held successfully");
      return true;
    } catch (error) {
      toast.error("Something went wrong");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // const handleLogout = async () => {
  //   if (currentCart) {
  //     if (!isBranchManager) {
  //       const res = await handleHoldCart(SYSTEM_HOLD_REASONS.LOGOUT);
  //       if (res) {
  //         clear_auth_session();
  //         router.push("/sign-in");
  //       } else {
  //         toast.error("Unable to hold cart");
  //       }
  //     } else {
  //       toast.error("You are not authorized to hold cart");
  //     }
  //   } else {
  //     await deleteMetadata();
  //     clear_auth_session();
  //     router.push("/sign-in");
  //     window.location.reload();
  //   }
  //   await deleteMetadata();
  //   clear_auth_session();
  // };

  const handleLogout = async () => {
    if (currentCart) {
      toast.error("Please hold or process the current cart before logging out");
      return;
    }

    try {
      await deleteMetadata();
      clear_auth_session();
      router.push("/sign-in");
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="#" alt="Avatar" />
                  <AvatarFallback className="bg-transparent">
                    {account?.real_name[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {account?.real_name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {account?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/dashboard" className="flex items-center">
              <LayoutGrid className="mr-3 h-4 w-4 text-muted-foreground" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/account" className="flex items-center">
              <User className="mr-3 h-4 w-4 text-muted-foreground" />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4 text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
