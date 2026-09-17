"use client";
import { ScanBarcodeIcon, Loader2, SearchCodeIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { fetchItemDetails, getEnhancedItemData, useInventory, useItemDetails } from "~/hooks/useInventory";
import { useCartStore } from "~/store/cart-store";
import { toast } from "sonner";
import { useAuthStore } from "~/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { DataTable } from "./data-table";
import {
  calculateCartTotal,
  calculateDiscount,
  generateRandomString,
  paymentColumns,
  tallyTotalAmountPaid,
  removeSpecialCharacters,
} from "~/lib/utils";
import { usePayStore } from "~/store/pay-store";
import { useManualPayments, useMpesaPayments } from "~/hooks/use-payments";
import {
  lookup_mpesa_by_code,
  initiate_stk_push,
  lookup_stk_payment,
} from "~/lib/actions/pay.actions";
import { useUpdateCart } from "../hooks/use-cart";
import { useRouter } from "next/navigation";
import { useEnhancedInventory } from "~/hawk-tuah/hooks/useEnhancedInventory";
import { Skeleton } from "./ui/skeleton";
import { pdf } from "@react-pdf/renderer";
import EnhancedTransactionReceiptPDF from "~/hawk-tuah/components/enhancedReceiptPdf";
import { isPrinterAvailable, printViaDeviceBridge } from "~/lib/printing/pos-printer";
import { submit_direct_sale_request_enhanced } from "~/hawk-tuah/actions/enhancedSubmission";
import { useEnhancedPaymentCalculations } from "~/hawk-tuah/components/enhancedAmountInput";

const ItemSearchBox = () => {
  const { addItemToPayments, validateAndAddPayment, paymentCarts, clearPaymentCarts } = usePayStore();
  const { inventory, loading, error, refetch: refetchInventory } = useInventory();
  const { getItemWithDiscounts } = useEnhancedInventory();
  const { site_url, site_company, account, receipt_info } = useAuthStore.getState();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { addItemToCart, currentCart, clearCart } = useCartStore();
  const { mutate: updateCartMutate } = useUpdateCart();
  const itemSearchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const item = inventory.find((invItem) => invItem.stock_id === searchTerm);
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError,
  } = useItemDetails(
    site_url!,
    site_company!,
    account!,
    item?.stock_id ?? "",
    item?.kit ?? "",
  );

  // ── Payment data ────────────────────────────────────────────────────────────
  const { manualPayments } = useManualPayments();
  const {
    mpesaPayments,
    loading: loadingMpesaPayments,
    refetch: refetchMpesaPayments,
  } = useMpesaPayments();

  const calculations = useEnhancedPaymentCalculations();
  const total = calculations.finalTotal;
  const totalPaid = tallyTotalAmountPaid(paymentCarts);
  const balance = total - totalPaid;

  // ── Submission state ────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── updateCashPayments — mirrors amount-input-box logic exactly ─────────────
  const updateCashPayments = (paymentCart: PaymentCart[], invoiceTotal: number): PaymentCart[] => {
    return paymentCart.map((cart) => {
      if (cart.paymentType?.includes("CASH")) {
        const totalCashPayments = cart.payments.reduce((sum, p) => {
          const amt = typeof p.TransAmount === "string" ? parseFloat(p.TransAmount) : parseFloat(p.TransAmount.toString());
          return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
        const otherPayments = paymentCart.filter((c) => !c.paymentType?.includes("CASH"));
        const totalOtherPayments = otherPayments.reduce((sum, c) => {
          return sum + c.payments.reduce((s, p) => {
            const amt = typeof p.TransAmount === "string" ? parseFloat(p.TransAmount) : parseFloat(p.TransAmount.toString());
            return s + (isNaN(amt) ? 0 : amt);
          }, 0);
        }, 0);
        const newCashAmount = invoiceTotal - totalOtherPayments;
        if (totalCashPayments + totalOtherPayments > invoiceTotal) {
          const overPayment = (totalCashPayments + totalOtherPayments) - invoiceTotal;
          return {
            ...cart,
            payments: [{
              Auto: generateRandomString(6),
              name: generateRandomString(6),
              TransID: `CASH ${generateRandomString(4)}`,
              TransAmount: (newCashAmount > 0 ? newCashAmount : 0).toString(),
              TransTime: new Date().toISOString(),
              Transtype: cart.paymentType,
              balance: overPayment,
            }],
          };
        }
      }
      return cart;
    });
  };

  // ── Mobile-safe PDF print/download ──────────────────────────────────────────
  const triggerReceiptDownload = async (data: SalesReceiptInformation) => {
    const pdfBlob = await pdf(
      <EnhancedTransactionReceiptPDF
        data={data}
        receipt_info={receipt_info!}
        account={account!}
        duplicate={true}
      />
    ).toBlob();

    // Built-in POS thermal printer, if present, prints silently and skips the download.
    if (isPrinterAvailable()) {
      try {
        await printViaDeviceBridge(pdfBlob);
        return;
      } catch (err) {
        console.error("Built-in printer failed, falling back to download:", err);
      }
    }

    const url = URL.createObjectURL(pdfBlob);
    // On mobile open in new tab so the browser's share/print sheet is available
    const newTab = window.open(url, "_blank");
    if (!newTab) {
      // Popup blocked — force download as fallback
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // ── Full invoice submission (mirrors handleProcessInvoice in amount-input-box) ─
  const handleSubmitInvoice = async () => {
    if (isSubmitting) return;

    // Read fresh from stores — avoids stale closure when called right after
    // validateAndAddPayment updates the Zustand store
    const { paymentCarts: freshCarts } = usePayStore.getState();
    const { currentCart: freshCart, currentCustomer: freshCustomer } = useCartStore.getState();

    if (!freshCart || freshCart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const customer = freshCustomer ?? {
      branch_code: "8", br_name: "CASH SALE-POS", branch_ref: "CASH",
      debtor_no: "8", lat: "", lon: "", is_farmer: "0", sales_type: "1", pin: "",
    };
    if (freshCarts.length === 0) {
      toast.error("Please add a payment before submitting");
      return;
    }
    const freshPaid = tallyTotalAmountPaid(freshCarts);
    if (freshPaid < total) {
      toast.error("Insufficient payment — amount paid is less than the total");
      return;
    }

    setIsSubmitting(true);
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);

    try {
      const payments = updateCashPayments(freshCarts, total);

      const result = await Promise.race([
        submit_direct_sale_request_enhanced(
          site_url!,
          site_company!.company_prefix,
          account!.id,
          account!.user_id,
          freshCart.items,
          customer,
          payments,
          customer.br_name,
          freshCart.cart_id,
          "",
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 45000)
        ),
      ]);

      if (!result || typeof result !== "object") {
        toast.error("Invalid response from server");
        return;
      }

      const response = result as Record<string, unknown>;

      if ((response.status as string)?.toLowerCase() === "failed") {
        const msg = (response.Message ?? response.reason ?? "Transaction failed") as string;
        if (msg.includes("Unique Identifier already Exist")) {
          toast.error("This cart was already processed. Please start a new cart.");
          clearCart();
          clearPaymentCarts();
        } else {
          toast.error(msg);
        }
        return;
      }

      const isSuccess =
        (response.status as string)?.toLowerCase() === "success" ||
        (response.message as string)?.toLowerCase() === "success" ||
        (response.Message as string)?.toLowerCase() === "success";

      if (isSuccess) {
        toast.success("Invoice processed successfully");
        localStorage.setItem("transaction_history", JSON.stringify(response));

        // Download/open receipt on mobile
        try {
          await triggerReceiptDownload(response as SalesReceiptInformation);
        } catch (printErr) {
          console.error("Receipt error:", printErr);
          toast.info("Invoice saved — reprint from Transactions if needed");
        }

        // Clean up
        clearCart();
        clearPaymentCarts();
        setDialogOpen(false);
      } else {
        const msg = (response.Message ?? response.reason ?? "Transaction failed") as string;
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error(msg);
    } finally {
      window.removeEventListener("beforeunload", beforeUnload);
      setIsSubmitting(false);
    }
  };

  // ── Pay-Now dialog state ────────────────────────────────────────────────────
  const [lookupRef, setLookupRef] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [stkPhone, setStkPhone] = useState("");
  const [stkLoading, setStkLoading] = useState(false);
  const stkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [foundTransaction, setFoundTransaction] = useState<Payment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Manual-payment form state (one form shared across all account tiles)
  const [selectedAccount, setSelectedAccount] = useState<ManualBankPaymentAccount | null>(null);
  const [pName, setPName] = useState("");
  const [txNo, setTxNo] = useState("");
  const [manualAmt, setManualAmt] = useState("");

  const maskPhone = (v: string | number) => {
    const s = String(v);
    return s.length < 7 ? s : `${s.slice(0, 4)}***${s.slice(-3)}`;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  // After adding a payment, auto-submit if balance is now covered.
  // Reads fresh from the store to avoid stale closure values.
  const submitIfCovered = () => {
    const { paymentCarts: fresh } = usePayStore.getState();
    const freshPaid = tallyTotalAmountPaid(fresh);
    if (freshPaid >= total) {
      void handleSubmitInvoice();
    } else {
      setDialogOpen(false);
    }
  };

  const handleMpesaRowClick = (rowData: Payment) => {
    validateAndAddPayment({ item: rowData, paymentType: "MPESA", balance });
    submitIfCovered();
  };

  const handleMpesaLookup = async () => {
    setIsLookupLoading(true);
    try {
      const res = await lookup_mpesa_by_code(site_url!, lookupRef.trim());
      if (res.payment_success && res.data?.transaction) {
        const tx = res.data.transaction;
        setFoundTransaction({
          Auto: tx.id,
          name: tx.phone,
          TransID: tx.mpesa_receipt_number,
          TransAmount: tx.amount,
          TransTime: tx.transaction_date,
        });
        setConfirmOpen(true);
      } else {
        toast.error(res.message || "Transaction not found.");
      }
    } catch {
      toast.error("Lookup failed. Please try again.");
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleStkPush = async () => {
    if (!stkPhone.trim()) { toast.error("Please enter a phone number"); return; }
    setStkLoading(true);
    const reference = `BW${Date.now().toString().slice(-10)}`;
    try {
      const auth = localStorage.getItem("auth-storage");
      const authObj = auth ? JSON.parse(auth) : null;
      const branch = authObj?.state?.account?.default_store_name;
      const res = await initiate_stk_push(site_url!, stkPhone.trim(), balance, reference, "BudgetWear", branch);
      if (!res?.success) { toast.error(res?.message || "STK push failed"); setStkLoading(false); return; }
      toast.success(res.message);
      const checkoutRequestId = res.data.checkout_request_id;
      let elapsed = 0;
      const poll = async () => {
        elapsed += 5000;
        if (elapsed >= 60000) {
          clearInterval(stkPollRef.current!);
          setStkLoading(false);
          toast.error("Payment timed out. Please try manual lookup.");
          return;
        }
        try {
          const lookup = await lookup_stk_payment(site_url!, checkoutRequestId);
          if (lookup?.payment_failed) {
            clearInterval(stkPollRef.current!);
            setStkLoading(false);
            toast.error(lookup.message || "Payment failed or was cancelled.");
            return;
          }
          if (lookup?.payment_success && lookup.data?.transaction) {
            clearInterval(stkPollRef.current!);
            setStkLoading(false);
            const tx = lookup.data.transaction;
            setFoundTransaction({
              Auto: tx.id, name: tx.phone,
              TransID: tx.mpesa_receipt_number,
              TransAmount: tx.amount, TransTime: tx.transaction_date,
            });
            setConfirmOpen(true);
            setStkPhone("");
          }
        } catch { /* keep polling */ }
      };
      stkPollRef.current = setInterval(() => { void poll(); }, 5000);
    } catch {
      toast.error("Failed to initiate STK push");
      setStkLoading(false);
    }
  };

  const handleConfirmTransaction = () => {
    if (!foundTransaction) return;
    validateAndAddPayment({ item: foundTransaction, paymentType: "MPESA", balance });
    setConfirmOpen(false);
    setFoundTransaction(null);
    setLookupRef("");
    setStkPhone("");
    submitIfCovered();
  };

  const handleManualSubmit = () => {
    if (!selectedAccount) return;
    if (!manualAmt.trim() || parseFloat(manualAmt) <= 0) { toast.error("Enter a valid amount"); return; }
    const isCash = selectedAccount.ttp.includes("CASH");
    if (!isCash) {
      if (!txNo.trim()) { toast.error("Enter a transaction number"); return; }
      if (!pName.trim()) { toast.error("Enter the payer's name"); return; }
    }
    validateAndAddPayment({
      item: {
        Auto: txNo,
        name: removeSpecialCharacters(pName || "CASH"),
        TransAmount: manualAmt,
        TransID: txNo || `CASH-${Date.now()}`,
        TransTime: Date.now(),
      },
      paymentType: selectedAccount.ttp,
      balance,
    });
    setPName(""); setTxNo(""); setManualAmt(""); setSelectedAccount(null);
    submitIfCovered();
  };

  // ── Cart / inventory effects (unchanged) ───────────────────────────────────

  const handleUpdateCart = (cart_id: string, newCart: Cart) => {
    updateCartMutate({ cart_id, newCart });
  };

  useEffect(() => {
    if (!site_company || !account) {
      toast.error("Please sign in to access this page.");
      router.replace("/sign-in");
    }
  }, [account, site_company]);

  useEffect(() => {
    if (currentCart) handleUpdateCart(currentCart.cart_id, currentCart);
  }, [currentCart]);

  useEffect(() => {
    const addItemWithEnhancement = async () => {
      if (item) {
        if (detailsLoading) {
          // Stock lookup is still in flight — not a failure, just not
          // resolved yet. Wait for it instead of reporting a false error.
          return;
        }
        if (detailsError) {
          toast.error(
            detailsError instanceof Error
              ? detailsError.message
              : "Couldn't check stock — please scan again",
          );
          return;
        }
        if (details === null || details === undefined) {
          toast.error("Couldn't check stock — please scan again");
          setSearchTerm("");
          return;
        }
        if (details.quantity_available <= 0) { toast.error("Item is out of stock"); return; }
        const enhancedData = await getItemWithDiscounts(item.stock_id);
        const directSalesItem: DirectSales = {
          __typename: "direct_sales",
          user: "current_user",
          max_quantity: details.quantity_available,
          item,
          details: enhancedData ? {
            price: enhancedData.has_discount ? enhancedData.discounted_price : parseFloat(enhancedData.price),
            quantity_available: details.quantity_available,
            tax_mode: parseInt(details.tax_mode.toString()),
          } : details,
          quantity: 1,
          discount: "0.00",
          enhanced_item: enhancedData,
        };
        addItemToCart(directSalesItem);
        setSearchTerm("");
      } else if (searchTerm.length >= 15) {
        // Not in the cached list — ask the server directly before giving up.
        // Stock booked to this branch mid-shift won't be in the cache yet.
        try {
          const serverDetails = await fetchItemDetails(searchTerm, undefined, true);
          if (serverDetails !== null && serverDetails !== undefined) {
            // Refresh the cached list in the background for next time, but
            // don't gate adding-to-cart on that refresh landing — the item
            // may be excluded from the list endpoints (e.g. discount/approval
            // filtering) even though this direct lookup is authoritative.
            refetchInventory();

            if (serverDetails.quantity_available <= 0) {
              toast.error("Item is out of stock");
              setSearchTerm("");
              return;
            }

            const enhancedData = await getItemWithDiscounts(searchTerm);
            const fallbackItem: InventoryItem = {
              stock_id: searchTerm,
              description: enhancedData?.description ?? searchTerm,
              rate: enhancedData?.rate ?? "0",
              kit: enhancedData?.kit ?? "",
              units: enhancedData?.units ?? "",
              mb_flag: enhancedData?.mb_flag ?? "",
              branch_name: enhancedData?.branch_name ?? "",
              pulldown: "",
              item: searchTerm,
              price: enhancedData?.price ?? serverDetails.price.toString(),
              selling_price: enhancedData?.price ?? serverDetails.price.toString(),
              balance: enhancedData?.balance ?? serverDetails.quantity_available.toString(),
            };
            const directSalesItem: DirectSales = {
              __typename: "direct_sales",
              user: "current_user",
              max_quantity: serverDetails.quantity_available,
              item: fallbackItem,
              details: enhancedData ? {
                price: enhancedData.has_discount ? enhancedData.discounted_price : parseFloat(enhancedData.price),
                quantity_available: serverDetails.quantity_available,
                tax_mode: serverDetails.tax_mode,
              } : serverDetails,
              quantity: 1,
              discount: "0.00",
              enhanced_item: enhancedData,
            };
            addItemToCart(directSalesItem);
            setSearchTerm("");
            return;
          }
          toast.error("Item not found in inventory");
        } catch (lookupError) {
          console.error("Server lookup for unknown code failed:", lookupError);
          toast.error(
            lookupError instanceof Error
              ? lookupError.message
              : "Couldn't check stock — please scan again",
          );
        }
        setSearchTerm("");
      }
    };
    addItemWithEnhancement();
  }, [searchTerm, item, details, detailsLoading, detailsError]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") { itemSearchRef.current?.focus(); event.preventDefault(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading || detailsLoading)
    return (
      <div className="max-w-full animate-pulse">
        <div className="mb-2.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="mb-2.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="mb-2.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form className="ml-auto flex-1 sm:flex-initial" onSubmit={(e) => e.preventDefault()}>
      <div className="relative flex items-center gap-2">
        <ScanBarcodeIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={itemSearchRef}
          name="item-search"
          autoFocus
          type="search"
          placeholder="Search for product..."
          className="pl-8 sm:w-[300px] md:w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* ── Pay Now — only visible on small screens ── */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (stkPollRef.current) clearInterval(stkPollRef.current);
              setStkLoading(false); setStkPhone(""); setLookupRef("");
              setSelectedAccount(null);
            }
            setDialogOpen(open);
          }}
        >
          <DialogTrigger asChild className="flex md:hidden">
            <Button variant="default">Pay Now</Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment</DialogTitle>
              <DialogDescription>
                Select mode of payment and enter the payment details.
              </DialogDescription>
            </DialogHeader>

            {/* ── Top-level tabs: Mpesa | Accounts ── */}
            <Tabs defaultValue="mpesa" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mpesa">Mpesa</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
              </TabsList>

              {/* ════ MPESA TAB ════ */}
              <TabsContent value="mpesa" className="mt-2 min-h-0 flex-1 overflow-y-auto">
                <Tabs defaultValue="all">
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="lookup" className="flex-1">Lookup</TabsTrigger>
                    <TabsTrigger value="stk" className="flex-1">STK Push</TabsTrigger>
                  </TabsList>

                  {/* All — live M-Pesa payments list */}
                  <TabsContent value="all">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Search by amount or name to find an incoming M-Pesa payment
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="no-scrollbar max-h-[220px] overflow-y-auto">
                        {loadingMpesaPayments ? (
                          <div className="space-y-2">
                            <Skeleton className="h-8 w-full rounded" />
                            <Skeleton className="h-6 w-3/4 rounded" />
                            <Skeleton className="h-6 w-1/2 rounded" />
                          </div>
                        ) : (
                          <DataTable
                            columns={paymentColumns}
                            filCol="TransAmount"
                            data={mpesaPayments}
                            onRowClick={handleMpesaRowClick}
                            onRefetch={refetchMpesaPayments}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Lookup by M-Pesa reference */}
                  <TabsContent value="lookup">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Enter the M-Pesa reference (e.g. QHJ4XXXXXX) to confirm payment
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-1">
                        <Label>Reference Number</Label>
                        <Input
                          placeholder="M-Pesa reference"
                          value={lookupRef}
                          onChange={(e) => setLookupRef(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && lookupRef.trim()) void handleMpesaLookup();
                          }}
                        />
                        <div className="flex justify-end">
                          <Button
                            disabled={!lookupRef.trim() || isLookupLoading}
                            onClick={() => void handleMpesaLookup()}
                          >
                            {isLookupLoading ? (
                              <><span className="mr-1">Looking</span><Loader2 className="h-4 w-4 animate-spin" /></>
                            ) : (
                              <><SearchCodeIcon className="mr-1 h-4 w-4" />Lookup</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* STK Push */}
                  <TabsContent value="stk">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Send a payment prompt directly to the customer&apos;s phone
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-1">
                        <Label>Phone Number</Label>
                        <Input
                          placeholder="07XXXXXXXX"
                          inputMode="tel"
                          value={stkPhone}
                          onChange={(e) => setStkPhone(e.target.value)}
                          disabled={stkLoading}
                        />
                        <Label>Amount (KES)</Label>
                        <Input value={balance > 0 ? balance : ""} disabled />
                        <div className="flex justify-end">
                          <Button
                            disabled={!stkPhone.trim() || stkLoading}
                            onClick={() => void handleStkPush()}
                          >
                            {stkLoading ? (
                              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Waiting…</>
                            ) : (
                              "Send STK Push"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* ════ ACCOUNTS TAB ════ */}
              <TabsContent value="accounts" className="mt-2 min-h-0 flex-1 overflow-y-auto">
                {selectedAccount === null ? (
                  /* Account picker */
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {manualPayments.length === 0 && (
                      <p className="col-span-2 text-center text-sm text-muted-foreground">
                        No payment accounts configured.
                      </p>
                    )}
                    {manualPayments.map((acc, i) => (
                      <Card
                        key={i}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setSelectedAccount(acc);
                          setManualAmt(balance > 0 ? String(balance) : "");
                        }}
                      >
                        <CardHeader className="p-3 text-center">
                          <p className="text-sm font-medium">{acc.bank_account_name}</p>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* Payment entry form */
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{selectedAccount.bank_account_name}</CardTitle>
                      <CardDescription>
                        Enter payment details for this transaction
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!selectedAccount.ttp.includes("CASH") && (
                        <>
                          <Label>Paid By</Label>
                          <Input
                            placeholder="Payer name"
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                          />
                          <Label>Transaction Number</Label>
                          <Input
                            placeholder="Reference / transaction ID"
                            value={txNo}
                            onChange={(e) => setTxNo(e.target.value)}
                          />
                        </>
                      )}
                      <Label>Amount (KES)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={manualAmt}
                        onChange={(e) => setManualAmt(e.target.value)}
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedAccount(null);
                            setPName(""); setTxNo(""); setManualAmt("");
                          }}
                        >
                          ← Back
                        </Button>
                        <Button className="flex-1" onClick={handleManualSubmit}>
                          Add Payment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* ── Sticky submit button ── */}
            <div className="border-t pt-3">
              <Button
                className="w-full"
                disabled={isSubmitting || paymentCarts.length === 0 || totalPaid < total}
                onClick={() => void handleSubmitInvoice()}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                ) : totalPaid >= total && paymentCarts.length > 0 ? (
                  "Process Payment"
                ) : (
                  `Balance: KES ${balance > 0 ? balance.toFixed(2) : "0.00"}`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Confirm found transaction ── */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Transaction Found</DialogTitle>
              <DialogDescription>Proceed with this M-Pesa payment?</DialogDescription>
            </DialogHeader>
            {foundTransaction && (
              <div className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone / Name</span>
                  <span className="font-medium">{maskPhone(foundTransaction.name)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">KES {foundTransaction.TransAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">M-Pesa Ref</span>
                  <span className="font-mono font-medium">{foundTransaction.TransID}</span>
                </div>
              </div>
            )}
            <DialogFooter className="flex-row gap-2">
              <DialogClose asChild>
                <Button variant="secondary" className="flex-1">No</Button>
              </DialogClose>
              <Button className="flex-1" onClick={handleConfirmTransaction}>Yes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </form>
  );
};

export default ItemSearchBox;
