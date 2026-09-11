"use client";

import Link from "next/link";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { Ellipsis, Headset, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import emailjs from "@emailjs/browser";

import { cn, SYSTEM_HOLD_REASONS } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "~/components/ui/tooltip";
import { getMenuList } from "~/lib/menu-list";
import { CollapseMenuButton } from "./collapse-menu-button";
import { useAuthStore } from "~/store/auth-store";
import { deleteMetadata } from "~/utils/indexeddb";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { useCartStore } from "~/store/cart-store";
import { submit_hold_direct_sale_request } from "~/lib/actions/user.actions";

interface MenuProps {
  isOpen: boolean | undefined;
}

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

export default function Menu({ isOpen }: MenuProps) {
  const roles = localStorage.getItem("roles");
  const form = useRef<HTMLFormElement>(null);
  const isInventoryManager = roles ? roles?.includes("mInventoryManager") : false;
  const isBranchManager = roles ? roles?.includes("mBranchManager") : false;
  const isAdmin = roles ? roles?.includes("lOn Map") : false;
  const [bManager, setBManager] = useState<boolean>(isBranchManager);
  const [inventoryManager, setInventoryManager] = useState<boolean>(
    isInventoryManager,
  );
  const [admin, setAdmin] = useState<boolean>(isAdmin);
  const pathname = usePathname();
  const { clear_auth_session, site_url, site_company, account } =
    useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const { currentCart, currentCustomer, holdCart } = useCartStore(
    (state) => state,
  );

  const router = useRouter();
  useEffect(() => {
    if (roles?.includes("mBranchManager")) {
      setBManager(true);
    } else {
      setBManager(false);
    }
  }, [roles]);

  useEffect(() => {
    if (roles?.includes("mInventoryManager")) {
      setInventoryManager(true);
    } else {
      setInventoryManager(false);
    }
  }, [roles]);

  useEffect(() => {
    if (roles?.includes("lOn Map")) {
      setAdmin(true);
    } else {
      setAdmin(false);
    }
  }, [roles]);

  const sendEmail = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.current) {
      emailjs
        .sendForm("service_n8bus2f", "template_mpbzpp2", form.current, {
          publicKey: "oyEoc45SGXJFxQWX3",
        })
        .then(
          () => {
            console.log("SUCCESS!");
            toast.success("Email sent successfully");
          },
          (error) => {
            console.log("FAILED...", error);
            toast.error("Failed to send email: " + error);
          },
        );
      form.current.reset();
    }
  };
  const menuList = getMenuList(pathname, bManager, admin, inventoryManager);

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

      const response = result as ServerResponse;

      console.log("Server response", response);

      if(response.status?.toLowerCase() === 'failed') {
        const errorMessage = response.Message || response.reason || "Cart failed to hold";
        toast.warning(errorMessage);
        return response;
      }

      if (!result) {
        // sentry.captureException(result);
        toast.error("Hold  Action failed");
        setIsLoading(false);
        return false;
      }

      holdCart();

      toast.success("Cart held successfully");
      return response;
    } catch (error) {
      toast.error("Something went wrong");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
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
    //       await deleteMetadata()
    //       clear_auth_session();
    //       router.push("/sign-in");
    //       window.location.reload();
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
    //   window.location.reload();
    // };

    const handleLogout = async () => {
      if (currentCart) {
          // Show user they need to handle cart first
          toast.error("Please hold or process the current cart before logging out");
          return;
      }
      
      try {
          // No cart exists, proceed with logout
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
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full">
        <ul className="flex min-h-[calc(100vh-48px-36px-16px-32px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100vh-32px-40px-32px)]">
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
              {(isOpen && groupLabel) ?? isOpen === undefined ? (
                <p className="max-w-[248px] truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
                  {groupLabel}
                </p>
              ) : !isOpen && isOpen !== undefined && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="flex w-full items-center justify-center">
                        <Ellipsis className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}
              {menus.map(
                ({ href, label, icon: Icon, active, submenus }, index) =>
                  submenus.length === 0 ? (
                    <div className="w-full" key={index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={active ? "secondary" : "ghost"}
                              className="mb-1 h-10 w-full justify-start"
                              asChild
                            >
                              <Link href={href}>
                                <span
                                  className={cn(isOpen === false ? "" : "mr-4")}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    "max-w-[200px] truncate",
                                    isOpen === false
                                      ? "-translate-x-96 opacity-0"
                                      : "translate-x-0 opacity-100",
                                  )}
                                >
                                  {label}
                                </p>
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          {isOpen === false && (
                            <TooltipContent side="right">
                              {label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="w-full" key={index}>
                      <CollapseMenuButton
                        icon={Icon}
                        label={label}
                        active={active}
                        submenus={submenus}
                        isOpen={isOpen}
                      />
                    </div>
                  ),
              )}
            </li>
          ))}

          <li className="flex w-full grow items-end">
            <TooltipProvider disableHoverableContent>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="mt-5 h-10 w-full justify-center"
                  >
                    <span className={cn(isOpen === false ? "" : "mr-4")}>
                      <LogOut size={18} />
                    </span>
                    <p
                      className={cn(
                        "whitespace-nowrap",
                        isOpen === false ? "hidden opacity-0" : "opacity-100",
                      )}
                    >
                      Sign out
                    </p>
                  </Button>
                </TooltipTrigger>
                {isOpen === false && (
                  <TooltipContent side="right">Sign out</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </li>
          <li className="flex w-full  items-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className=" h-10 w-full justify-center"
                  variant="secondary"
                >
                  <span className={cn(isOpen === false ? "" : "mr-4")}>
                    <Headset size={18} />
                  </span>
                  Contact Support
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Contact Support</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <form ref={form} onSubmit={sendEmail}>
                  <div className="flex  flex-col items-center space-x-2 space-y-1">
                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="from_name">Name</Label>
                      <Input id="from_name" name={"from_name"} type="text" />
                    </div>
                    <div className="hidden">
                      <Label htmlFor="to_name">Phone</Label>
                      <Input
                        type="text"
                        id="to_name"
                        name={"to_name"}
                        readOnly
                        value={"Digisoft Support"}
                      />
                    </div>
                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="from_phone">Phone</Label>
                      <Input type="tel" id="from_phone" name={"from_phone"} />
                    </div>

                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="from_email">Email</Label>
                      <Input type="email" id="from_email" name={"from_email"} />
                    </div>
                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="ticket_number">Ticket Number</Label>
                      <Input
                        type="text"
                        id="ticket_number"
                        name={"ticket_number"}
                        value={`#${new Date().toJSON()}`}
                        readOnly
                      />
                    </div>
                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input type="text" id="subject" name={"subject"} />
                    </div>
                    <div className="grid w-full flex-1 gap-2">
                      <Label htmlFor="message">Description</Label>
                      <Textarea
                        placeholder="Type your message here."
                        id="message"
                        name={"message"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your message will be copied to the support team.
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="flex w-full flex-row justify-center">
                    <DialogClose asChild>
                      <Button variant="secondary">Close</Button>
                    </DialogClose>
                    <Button type="submit">Send message</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </nav>
    </ScrollArea>
  );
}
