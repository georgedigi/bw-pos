"use client";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import {
  CaptionsOffIcon,
  Clapperboard,
  ClipboardPaste,
  EllipsisIcon,
  Loader2,
  LogOutIcon,
  // CopyIcon,
  // MoveVerticalIcon,
  PauseIcon,
  PercentIcon,
  RefreshCcwIcon,
  RefreshCwOffIcon,
  SearchIcon,
  SendIcon,
  ShoppingBasketIcon,
  User2Icon,
} from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
//   DropdownMenuSeparator,
// } from "~/components/ui/dropdown-menu";
import { cn, SYSTEM_HOLD_REASONS } from "~/lib/utils";
import { useCartStore } from "~/store/cart-store";
import { toast } from "sonner";
import { usePayStore } from "~/store/pay-store";
import { useAuthStore } from "~/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { CustomerComboBox } from "./common/customercombo";
import { useCustomers } from "~/hooks/use-customer-payments";
import { TimerIcon } from "@radix-ui/react-icons";
import { useStore } from "~/hooks/use-store";
import { useSidebarToggle } from "~/hooks/use-sidebar-toggle";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  submit_authorization_request,
  submit_end_shift,
  submit_hold_direct_sale_request,
} from "~/lib/actions/user.actions";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useUpdateCart } from "~/hooks/use-cart";
import {
  useOfflineInvoices,
  useUnsyncedInvoices,
} from "~/hooks/use-unsynced-invoices";
import { sync_invoice } from "~/lib/actions/pay.actions";
import { Skeleton } from "./ui/skeleton";
import CartCounter from "./CartCounter";
import HoldCartDialog from "~/hawk-tuah/components/HoldCartDialog";

const CartActions = () => {
  const {
    currentCart,
    currentCustomer,
    holdCart,
    addItemToCart,
    copiedCartItems,
    selectedCartItem,
    update_cart_item,
    setSelectedCartItem,
    setCurrentCustomer,
    deleteItemFromCart,
    clearCart,
    setCopiedCartItems,
  } = useCartStore((state) => state);
  const { mutate: updateCartMutate } = useUpdateCart();
  const router = useRouter();
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { paymentCarts } = usePayStore();
  const { site_url, site_company, account, clear_auth_session } =
    useAuthStore();

  const [action, setAction] = useState<string>("");
  const [pload, setPload] = useState<boolean>(false);
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [discountPercentage, setDiscountPercentage] = useState<string>("0");
  const [quantityValue, setQuantityValue] = useState<string>("0");
  const [authPass, setAuthPass] = useState<string>("");
  const [isAuthorized, setAuthorized] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState<boolean>(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState<boolean>(false);
  const [authorizationDialogOpen, setAuthorizationDialogOpen] =
    useState<boolean>(false);
  const [auto_sync_status, setAutoSyncStatus] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const { unsyncedInvoices, loading, error, refetch } = useUnsyncedInvoices();
  const { unsyncedInvoices: offlineInvoices, loading: offlineLoading } =
    useOfflineInvoices();
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false);

  type ServerResponse = {
    message: string;
    Message?: string;
    invNo?: string;
    delNo?: string;
    vat?: number;
    ttpAuto?: any;
    items?: string[];
    reason?: string;
    [key: string]: any;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCartItem(null);
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F2") {
        handleQuantityDialogOpen();
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F3") {
        handleDiscountDialogOpen();
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F4") {
        void handleCheckOut();
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      // if (event.key === "F5") {
      //   async () => await handleClearCart();
      //   event.preventDefault(); // Optional: Prevents the default browser action for F1
      // }
      if (event.key === "F6") {
        setDialogOpen(true);
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F7") {
        router.push("/transactions");
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F8") {
        handleHoldCart().catch((error) => {
          console.log("error", error);
          toast.error("Unable to hold cart");
        });
        event.preventDefault(); // Optional: Prevents the default browser action for F1
      }
      if (event.key === "F9") {
        event.preventDefault(); // Optional: Prevents the default browser action for F9
        void handleLogout();
      }

      if (event.key === "F10") {
        router.push("/payment");
        event.preventDefault(); // Optional: Prevents the default browser action for F9
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    const cCartItems = localStorage.getItem("cart");
    console.log("cCartItems", cCartItems);

    const copiedItems: { items: DirectSales[] } = cCartItems
      ? JSON.parse(cCartItems)
      : [];
    if (copiedItems.items && copiedItems.items.length > 0) {
      setCopiedCartItems(copiedItems.items);
    } else {
      setCopiedCartItems(null);
    }
  }, []);

  useEffect(() => {
    if (discountPercentage !== "") {
      if (Number(discountPercentage) < 0 || Number(discountPercentage) > 100) {
        toast.error("Please enter a valid percentage");
        return;
      }
      const val = selectedCartItem
        ? (Number(discountPercentage) / 100) *
        selectedCartItem.details.price *
        selectedCartItem.quantity
        : 0;

      setDiscountValue(val.toString());
    }
  }, [discountPercentage, selectedCartItem]);

  useEffect(() => {
    if (currentCart) {
      handleUpdateCart(currentCart.cart_id, currentCart);
    }
  }, [currentCart]);

  useEffect(() => {
    if (unsyncedInvoices.length > 0 && navigator.onLine) {
      handleAutoSync().catch((error) => {
        console.log("error", error);
        toast.error("Unable to sync invoices");
      });
    } else {
      setAutoSyncStatus(false);
    }
  }, []);

  // const handleLogout = async () => {
  //   if (currentCart) {
  //     const res = await handleHoldCart(SYSTEM_HOLD_REASONS.LOGOUT);
  //     console.log("Server response: ", res);

  //     if (!res || typeof res !== "object") {
  //       toast.error("Invalid response received from server");
  //       return;
  //     }

  //     if (res.status?.toLowerCase() === "failed") {
  //       const errorMessage = res.Message || res.reason || "Unknown error occurred";

  //       if (errorMessage.includes("The user has no active shift.")) {
  //         toast.error("Please start your shift!");
  //         // clearCart()
  //         return;
  //       }

  //       toast.error(errorMessage);
  //       return;
  //     }

  //     // Handle success response
  //     if (res.message?.toLowerCase() === "success") {
  //       clear_auth_session();
  //       router.push("/sign-in");
  //       return;
  //     }

  //     // Fallback for unexpected responses
  //     toast.error("Unexpected response from server");
  //     console.error("Unexpected response structure: ", res);
  //     return;
  //   }

  //   // If no cart, proceed with logout
  //   clear_auth_session();
  //   router.push("/sign-in");
  // };

  const handleLogout = async () => {
    if (currentCart) {
      // Prevent logout if cart exists
      toast.error("Please hold or process the current cart before logging out");
      return;
    }

    try {
      // No cart exists, proceed with logout
      clear_auth_session();
      router.push("/sign-in");
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  const handleHoldCart = async (systemReason?: typeof SYSTEM_HOLD_REASONS[keyof typeof SYSTEM_HOLD_REASONS]) => {
    if (isLoading) return null;

    if (!currentCart) {
      toast.error("Please add items to cart");
      return null;
    }

    if (!currentCustomer) {
      toast.error("Please select a customer");
      return null;
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

      const response = result as ServerResponse;

      console.log("Server response", response);

      if (response.status?.toLowerCase() === "failed") {
        const errorMessage = response.Message || response.reason || "Cart failed to hold";
        // clearCart();
        toast.warning(errorMessage);
        return response;
      }

      if (!result) {
        toast.error("Hold Action failed");
        return null;
      }

      holdCart();
      toast.success("Cart held successfully");
      return response;
    } catch (error) {
      console.error("Error holding cart", error);
      toast.error("Something went wrong");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleHoldCartWithReasons = async (selectedReasons: string[]): Promise<void> => {
    if (isLoading) return;

    if (!currentCart) {
      toast.error("Please add items to cart");
      return;
    }

    if (!currentCustomer) {
      toast.error("Please select a customer");
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
        selectedReasons,
      );

      const response = result as ServerResponse;

      if (response.status?.toLowerCase() === "failed") {
        const errorMessage = response.Message || response.reason || "Cart failed to hold";
        toast.warning(errorMessage);
        return;
      }

      if (!result) {
        toast.error("Hold Action failed");
        return;
      }

      holdCart();
      setIsHoldDialogOpen(false);
      toast.success("Cart held successfully");
    } catch (error) {
      console.error("Error holding cart", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };


  const handleAutoSync = async () => {
    console.log("handleAutoSync");
    if (offlineInvoices.length > 0 && auto_sync_status) {
      setSyncing(true);
      const failedIndexes: number[] = [];
      for (let i = 0; i < offlineInvoices.length; i++) {
        const invoice: UnsynchedInvoice = offlineInvoices[i];
        try {
          const response = await sync_invoice(
            site_url!,
            site_company!.company_prefix,
            invoice,
          );
          if (!response) {
            failedIndexes.push(i);
            console.log("failed to sync invoice", invoice.uid);
          }
        } catch (error) {
          failedIndexes.push(i);
          console.log("failed to sync invoice", invoice.uid);
        }
      }
      setSyncing(false);
      if (failedIndexes.length > 0) {
        toast.error("Failed to sync all invoices");
        console.log("failedIndexes", failedIndexes);
        setAutoSyncStatus(false);
      }
    }
  };

  const handlePaste = () => {
    if (copiedCartItems && currentCart) {
      toast.error("Please clear current cart before pasting");
    } else if (copiedCartItems && !currentCart) {
      copiedCartItems.forEach((item) => {
        addItemToCart(item);
      });
      setCopiedCartItems(null);
      localStorage.setItem("cart", JSON.stringify({ items: [] }));
    }
  };

  const { customer } = useCustomers();

  const handleDeleteItem = () => {
    if (isAuthorized) {
      setAction("edit_cart");
      if (selectedCartItem) {
        if (action !== "edit_cart") {
          toast.error("Invalid action - please perform an edit cart action");
          return;
        }
        deleteItemFromCart(selectedCartItem);
        setAuthorized(false);
      } else {
        toast.error("Please select an item to delete");
      }
    } else {
      setAction("edit_cart");
      setAuthorizationDialogOpen(true);
    }
  };

  const handleDiscountDialogOpen = () => {
    if (!selectedCartItem) {
      toast.error("Please select an item to discount");
      return;
    } else {
      if (isAuthorized) {
        setAction("discount");
        setDiscountDialogOpen(!discountDialogOpen);
        return;
      } else {
        setAction("discount");
        setAuthorizationDialogOpen(true);
      }
    }
  };

  const handleQuantityDialogOpen = () => {
    if (!selectedCartItem) {
      toast.error("Please select an item to edit");
      return;
    } else {
      if (isAuthorized) {
        setAction("edit_cart");
        setQuantityDialogOpen(true);
        return;
      } else {
        setAction("edit_cart");
        setAuthorizationDialogOpen(true);
      }
    }
  };

  const handleUpdateCart = (cart_id: string, newCart: Cart) => {
    updateCartMutate({ cart_id, newCart });
  };

  const handleIssueDiscount = () => {
    if (selectedCartItem) {
      if (discountValue === "") {
        toast.error("Please enter a discount value");
        return;
      }
      if (Number(discountValue) < 0) {
        toast.error("Please enter a valid discount value");
        return;
      }
      if (action !== "discount") {
        toast.error("Invalid action - please perform a discount action");
        return;
      }
      if (
        Number(discountValue) >
        selectedCartItem.details.price * selectedCartItem.quantity
      ) {
        toast.error("Discount value exceeds item price");
        return;
      }
      console.log("discountValue", discountValue);

      update_cart_item({
        ...selectedCartItem,
        discount: discountValue,
        item: {
          ...selectedCartItem.item,
          description: `${selectedCartItem.item.description} *`,
        },
      });
      console.log("selectedCartItem", currentCart);

      setDiscountValue("");
      setDiscountPercentage("");
      setAuthorized(false);
      setDiscountDialogOpen(false);
      setSelectedCartItem(null);
      handleUpdateCart(currentCart!.cart_id, currentCart!);
    }
  };

  const handleQuantityChange = () => {
    if (selectedCartItem) {
      if (Number(selectedCartItem.discount) > 0) {
        toast.error("Discounted items cannot be updated");
        return;
      }
      if (quantityValue === "" || Number(quantityValue) < 0) {
        toast.error("Please enter a valid quantity");
        return;
      }
      if (Number(quantityValue) > selectedCartItem.details.quantity_available) {
        toast.error("Quantity exceeds available quantity");
        return;
      }
      if (Number(quantityValue) > selectedCartItem.quantity) {
        toast.error("To increase quantity, please scan the barcode");
        return;
      }
      if (action !== "edit_cart") {
        toast.error("Invalid action - please perform an edit cart action");
        return;
      }

      update_cart_item({
        ...selectedCartItem,
        quantity: Number(quantityValue),
      });

      handleUpdateCart(currentCart!.cart_id, currentCart!);
      setQuantityValue("");
      setQuantityDialogOpen(false);
      setSelectedCartItem(null);
      setAuthorized(false);
    }
  };

  const handleAuthorization = async () => {
    try {
      const auth = await submit_authorization_request(
        site_url!,
        site_company!.company_prefix,
        username,
        authPass,
        action,
      );
      if (auth) {
        setAuthorized(true);
        toast.success("Authorized");
      } else {
        setAuthorized(false);
        toast.error("Unauthorized to perform this action");
      }
    } catch (error) {
      toast.error("Authorization Failed: Something Went Wrong");
    } finally {
      setTimeout(() => {
        setAuthPass("");
        setAction("");
        setAuthorizationDialogOpen(false);
      }, 2000);
    }
  };

  // const issueClearCart = async (id: string) => {
  //   console.log("issueClearCart");
  //   const response = await submit_clear_cart_request(
  //     site_url!,
  //     site_company!.company_prefix,
  //     id,
  //   );
  //   console.log("response", response);
  //   if (response?.message === "Success") {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // };

  // const handleCheckOut = async () => {
  //   console.log("checkout");
  //   const shift = localStorage.getItem("start_shift");
  //   const s: CheckInResponse = JSON.parse(shift!);
  //   if (currentCart) {
  //     const res = await handleHoldCart(SYSTEM_HOLD_REASONS.END_SHIFT);
  //     if (res) {
  //       const response = await submit_end_shift(
  //         site_url!,
  //         site_company!.company_prefix,
  //         account!.id,
  //         s.id,
  //       );
  //       console.log(" checkout response", response);

  //       if (response) {
  //         localStorage.removeItem("start_shift");
  //         toast.success("Shift ended");
  //         router.push("/dashboard");
  //       } else {
  //         toast.error("Failed to End shift");
  //       }
  //     } else {
  //       toast.error("Unable to hold cart");
  //       return;
  //     }
  //   } else {
  //     const response = await submit_end_shift(
  //       site_url!,
  //       site_company!.company_prefix,
  //       account!.id,
  //       s.id,
  //     );
  //     console.log(" checkout response", response);

  //     if (response) {
  //       localStorage.removeItem("start_shift");
  //       toast.success("Shift ended");
  //       router.push("/dashboard");
  //     } else {
  //       toast.error("Failed to End shift");
  //     }
  //   }
  // };

  const handleCheckOut = async () => {
    try {
      // Get shift data from localStorage
      const shiftData = localStorage.getItem("start_shift");
      if (!shiftData) {
        toast.error("No active shift found");
        return;
      }

      const shift: CheckInResponse = JSON.parse(shiftData);

      // Check for current cart
      if (currentCart) {
        toast.error("Please hold or process the current cart before ending your shift");
        return;
      }

      // Proceed with ending shift
      const response = await submit_end_shift(
        site_url!,
        site_company!.company_prefix,
        account!.id,
        shift.id,
      );

      if (response) {
        localStorage.removeItem("start_shift");
        toast.success("Shift ended");
        router.push("/dashboard");
      } else {
        toast.error("Failed to end shift");
      }

    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Failed to end shift. Please try again.");
    }
  };

  // if (!currentCart) return null;
  if (loading)
    return (
      <div className="hidden min-h-[88vh] flex-col justify-between py-2 md:flex">
        <div className=" grid w-full max-w-6xl gap-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-[250px] rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-[250px] rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-[250px] rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="hidden min-h-[88vh] flex-col justify-between py-2 md:flex">
      <div className=" grid w-full max-w-6xl gap-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {/* <Card
          className={cn(
            "rounded-none py-6",
            copiedCartItems && copiedCartItems?.length > 0
              ? "cursor-pointer bg-blue-500"
              : "cursor-pointer hover:bg-accent focus:bg-accent",
          )}
          onClick={handlePaste}
        >
          <CardHeader className="flex-col items-center justify-center p-0 text-sm">
            <ClipboardPaste
              className={cn(
                "h-8 w-8",
                copiedCartItems && copiedCartItems?.length > 0
                  ? "text-white"
                  : "text-zinc-400",
              )}
            />
            <h4
              className={cn(
                "text-center text-sm font-normal",
                copiedCartItems && copiedCartItems?.length > 0
                  ? "text-white"
                  : "text-zinc-400",
              )}
            >
              Paste
            </h4>
          </CardHeader>
        </Card> */}
        <Card className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent">
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F1
            </h6>
            <SearchIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Search</h4>
          </CardHeader>
        </Card>
        <Dialog
          open={authorizationDialogOpen}
          onOpenChange={setAuthorizationDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Authorize</DialogTitle>
              <DialogDescription>Authorize cart actions</DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <div className="grid gap-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="auth-cart-pass">Username</Label>
                    <Input
                      type="text"
                      id="auth-cart-username"
                      placeholder={"Authorization Username"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="auth-cart-pass">Password</Label>
                    <Input
                      type="password"
                      id="auth-cart-pass"
                      placeholder={"Authorization Password"}
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pload || isAuthorized}
                onClick={() => handleAuthorization()}
              >
                {pload ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> &nbsp;
                  </>
                ) : (
                  <>Authorize</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* <Dialog
          open={authorizationDialogOpen}
          onOpenChange={setAuthorizationDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Authorize</DialogTitle>
              <DialogDescription>Authorize cart actions</DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <ul className="grid gap-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="auth-cart-pass">Password</Label>
                    <Input
                      type="password"
                      id="auth-cart-pass"
                      placeholder={"Authorization Password"}
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                    />
                  </div>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleAuthorization()}>Authorize</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
        <Dialog
          open={quantityDialogOpen}
          onOpenChange={handleQuantityDialogOpen}
        >
          <DialogTrigger asChild>
            <Card className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent">
              <CardHeader className="flex-col items-center justify-center  p-2 ">
                <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
                  F2
                </h6>
                <ShoppingBasketIcon
                  className={cn(
                    "h-8 w-8",
                    selectedCartItem ? "text-zinc-700" : "text-zinc-400",
                  )}
                />
                <h4
                  className={cn(
                    "text-center text-sm font-normal",
                    selectedCartItem ? "text-zinc-700" : "text-zinc-400",
                  )}
                >
                  Edit
                </h4>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modify Cart</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <ul className="grid gap-3">
                  <li className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Item Name</span>

                    <span>{selectedCartItem?.item.description}</span>
                  </li>

                  <Separator className="my-2" />
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="quantity">New Quantity</Label>
                    <Input
                      type="text"
                      id="quantity"
                      placeholder={"Update Item Quantity"}
                      value={quantityValue}
                      onChange={(e) => setQuantityValue(e.target.value)}
                    />
                  </div>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleQuantityChange()}>
                Update Cart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={discountDialogOpen}
          onOpenChange={handleDiscountDialogOpen}
        >
          <DialogTrigger asChild>
            <Card
              className={cn(
                "rounded-none",
                selectedCartItem
                  ? "cursor-pointer bg-blue-500"
                  : "hover:bg-accent focus:bg-accent",
              )}
            >
              <CardHeader className="flex-col items-center justify-center  p-2 ">
                <h6
                  className={cn(
                    "self-start text-left text-xs font-semibold",
                    selectedCartItem ? "text-white" : "text-muted-foreground",
                  )}
                >
                  F3
                </h6>
                <PercentIcon
                  className={cn(
                    "h-8 w-8",
                    selectedCartItem ? "text-white" : "text-zinc-400",
                  )}
                />
                <h4
                  className={cn(
                    "text-center text-sm font-normal",
                    selectedCartItem ? "text-white" : "text-zinc-400",
                  )}
                >
                  Discount
                </h4>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Item Discount</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <ul className="grid gap-3">
                  <li className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Item Name</span>

                    <span>{selectedCartItem?.item.description}</span>
                  </li>

                  <Separator className="my-2" />
                  <Tabs defaultValue="value" className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="value">On Value</TabsTrigger>
                      <TabsTrigger value="percentage">
                        On Percentage
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="value">
                      <Card>
                        <CardHeader>
                          <CardDescription>
                            Enter amount to discount
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="discount">Discount</Label>
                            <Input
                              type="text"
                              id="discount"
                              placeholder={"0"}
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="percentage">
                      <Card>
                        <CardHeader>
                          <CardDescription>
                            Enter percentage to discount
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="discount">Discount</Label>
                            <Input
                              type="text"
                              id="discount"
                              placeholder={"0%"}
                              value={discountPercentage}
                              onChange={(e) =>
                                setDiscountPercentage(e.target.value)
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              Amounts to KES{" "}
                              {selectedCartItem &&
                                (Number(discountPercentage) / 100) *
                                selectedCartItem.details.price *
                                selectedCartItem.quantity}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </ul>
              </div>
            </div>
            <DialogFooter className=" ">
              <Button
                variant={"outline"}
                onClick={() => setDiscountDialogOpen(false)}
              >
                Close
              </Button>
              <Button onClick={() => handleIssueDiscount()}>
                Issue Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <CartCounter />

      <div className=" grid w-full max-w-6xl gap-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Card
          onClick={handleCheckOut}
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F4
            </h6>
            <CaptionsOffIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">End Shift</h4>
          </CardHeader>
        </Card>
        {/* <Card
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
          onClick={() => handleClearCart()}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F5
            </h6>
            <XIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Clear Cart</h4>
          </CardHeader>
        </Card> */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer rounded-none  hover:bg-accent focus:bg-accent">
              <CardHeader className="flex-col items-center justify-center  p-2 ">
                <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
                  F6
                </h6>
                <User2Icon className="h-8 w-8 " />
                <h4 className="text-center text-sm font-normal">
                  {currentCustomer
                    ? currentCustomer.br_name
                    : "Select Customer"}
                </h4>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader></DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <ul className="grid gap-3">
                  <Label>Select Customer</Label>
                  <CustomerComboBox
                    type="Customer"
                    data={customer}
                    setSelected={setCurrentCustomer}
                  />
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
          onClick={() => router.push("/transactions")}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F7
            </h6>
            <TimerIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Paused Carts</h4>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
          onClick={() => setIsHoldDialogOpen(true)}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F8
            </h6>
            <PauseIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Pause Sale</h4>
          </CardHeader>
        </Card>
        <Card
          className="flex-grow cursor-pointer  rounded-none hover:bg-accent focus:bg-accent"
          onClick={() => sidebar?.setIsOpen()}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start py-1 text-left text-xs font-semibold text-muted-foreground"></h6>
            <EllipsisIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Menu</h4>
          </CardHeader>
        </Card>
        <Card
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
          onClick={handleLogout}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F9
            </h6>
            <LogOutIcon className="h-8 w-8 " />
            <h4 className="text-center text-sm font-normal">Logout</h4>
          </CardHeader>
        </Card>

        <Card
          className="flex-grow cursor-pointer rounded-none bg-green-800 text-white hover:bg-green-800/90 "
          onClick={() => (syncing ? null : router.push("/payment"))}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-white">
              F10
            </h6>
            <SendIcon className="h-8 w-8 text-white " />
            <h4 className="text-center text-sm font-normal">Process Payment</h4>
          </CardHeader>
        </Card>
        {/* <Card
          className="cursor-pointer rounded-none hover:bg-accent focus:bg-accent"
          onClick={() => (syncing ? null : router.push("/unsynced-invoices"))}
        >
          <CardHeader className="flex-col items-center justify-center  p-2 ">
            <h6 className="self-start text-left text-xs font-semibold text-muted-foreground">
              F11
            </h6>
            {syncing && (
              <RefreshCcwIcon className={cn("h-8 w-8 animate-spin")} />
            )}
            {!syncing && (
              <RefreshCwOffIcon
                className={cn(
                  "h-8 w-8",
                  unsyncedInvoices.length > 0 ? "h-4 w-4 animate-pulse" : "",
                )}
              />
            )}
            <h4 className="text-center text-sm font-normal">
              Unsynced Invoices{" "}
              {!loading && !error && unsyncedInvoices.length > 0
                ? unsyncedInvoices.length
                : ""}
            </h4>
          </CardHeader>
        </Card> */}
        <HoldCartDialog
          isOpen={isHoldDialogOpen}
          onClose={() => setIsHoldDialogOpen(false)}
          onConfirm={handleHoldCartWithReasons}
          siteUrl={site_url!}
          companyPrefix={site_company!.company_prefix}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default CartActions;
