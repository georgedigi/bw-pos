"use client";
import React, { useState, useEffect } from "react";
import { getPaymentList } from "~/lib/payment-list";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { useManualPayments, useMpesaPayments } from "~/hooks/use-payments";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { DataTable } from "../data-table";
import { calculateCartTotal, calculateDiscount, paymentColumns, tallyTotalAmountPaid } from "~/lib/utils";
import { usePayStore } from "~/store/pay-store";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Loader2, SearchCodeIcon } from "lucide-react";
import { lookup_mpesa_by_code, initiate_stk_push, lookup_stk_payment } from "~/lib/actions/pay.actions";
import { useAuthStore } from "~/store/auth-store";
import { toast } from "sonner";
import { removeSpecialCharacters } from "../../lib/utils";
import { Skeleton } from "../ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { useCartStore } from "~/store/cart-store";


const maskPhone = (value: string | number): string => {
  const s = String(value);
  if (s.length < 7) return s;
  return `${s.slice(0, 4)}***${s.slice(-3)}`;
};

const PaymentOptions = ({
  amount,
  setAmount,
}: {
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { site_url } = useAuthStore();
  const { manualPayments } = useManualPayments();
  const {
    mpesaPayments,
    loading: loadingMpesaPayments,
    refetch: refetchMpesaPayments,
  } = useMpesaPayments();
  const {
    paymentCarts,
    validateAndAddPayment,
    showAmountAlert,
    pendingPayment,
    confirmPendingPayment,
    cancelPendingPayment,
  } = usePayStore();
  const [paid, setPaid] = useState<ManualBankPaymentAccount | null>(null);
  const [pName, setPName] = useState<string>("");
  const [transactionNumber, setTransactionNumber] = useState<string>("");
  const [amnt, setAmnt] = useState<string>(amount);
  const [lookupRef, setLookupRef] = useState<string>("");
  const [mpesaDialogOpen, setMpesaDialogOpen] = React.useState<boolean>(false);
  const [manualDialogOpen, setManualDialogOpen] =
    React.useState<boolean>(false);
  const [transactionFoundDialog, setTransactionFoundDialog] =
    useState<boolean>(false);
  const [foundTransaction, setFoundTransaction] = useState<Payment | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stkPhone, setStkPhone] = useState<string>("");
  const [stkLoading, setStkLoading] = useState<boolean>(false);
  const stkPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loadingMpesaPayments) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [loadingMpesaPayments]);

  const { currentCart } = useCartStore();
  const total = currentCart ? calculateCartTotal(currentCart) : 0;
  const discount = currentCart ? calculateDiscount(currentCart) : 0;

  // Calculate total amount already paid
  const totalPaid = tallyTotalAmountPaid(paymentCarts);

  // Calculate remaining balance
  const balance = total - discount - totalPaid;

  const handleMpesaRowClick = (rowData: Payment) => {
    validateAndAddPayment({
      item: rowData,
      paymentType: "MPESA",
      balance
    });
    if (!showAmountAlert) {
      setAmount("");
      setMpesaDialogOpen(false);
    }
  };

  const handleMpesaLookup = async () => {
 
    setIsLoading(true);
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
        setTransactionFoundDialog(true);
      } else {
        toast.error(res.message || "Transaction not found.");
      }
    } catch {
      toast.error("An error occurred during the lookup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStkPush = async () => {
     const auth = localStorage.getItem("auth-storage");
    if (!stkPhone || stkPhone.trim() === "") {
      toast.error("Please enter a phone number");
      return;
    }

    setStkLoading(true);
    const reference = `BW${Date.now().toString().slice(-10)}`;

    try {

       // Parse the stored JSON
  const account = auth ? JSON.parse(auth) : null;
  const branch = account?.state?.account?.default_store_name;
      const res = await initiate_stk_push(
  site_url!,
  stkPhone.trim(),
  parseFloat(amount) || balance,
  reference,
  "BudgetWear",
  branch
);

      if (!res?.success) {
        toast.error(res?.message || "STK push failed");
        setStkLoading(false);
        return;
      }

      toast.success(res.message);

      const checkoutRequestId = res.data.checkout_request_id;
      let elapsed = 0;
      const POLL_INTERVAL = 5000;
      const TIMEOUT = 60000;

      const poll = async () => {
        elapsed += POLL_INTERVAL;

        if (elapsed >= TIMEOUT) {
          clearInterval(stkPollRef.current!);
          setStkLoading(false);
          toast.error("Payment timed out. Please try again or use manual lookup.");
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
              Auto: tx.id,
              name: tx.phone,
              TransID: tx.mpesa_receipt_number,
              TransAmount: tx.amount,
              TransTime: tx.transaction_date,
            });
            setTransactionFoundDialog(true);
            setStkPhone("");
          }
        } catch {
          // network hiccup — keep trying until timeout
        }
      };

      stkPollRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL);
    } catch {
      toast.error("Failed to initiate STK push");
      setStkLoading(false);
    }
  };

  const handleManualSubmit = (ttp: string) => {
    if (!amnt || amnt.trim() === "" || parseFloat(amnt) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!ttp.includes("CASH")) {
      if (!transactionNumber || transactionNumber.trim() === "") {
        toast.error("Please enter a transaction number");
        return;
      }

      if (!pName || pName.trim() === "") {
        toast.error("Please enter the payer's name");
        return;
      }
    }

    const payment = {
      Auto: transactionNumber,
      name: removeSpecialCharacters(pName),
      TransAmount: amnt,
      TransID: transactionNumber,
      TransTime: Date.now(),
    };

    validateAndAddPayment({
      item: payment,
      paymentType: ttp,
      balance
    });
    if (!showAmountAlert) {
      setAmnt("");
      setAmount("");
      setTransactionNumber("");
      setPName("");
      setManualDialogOpen(false);
    }
  };


  const handleTransactionFound = () => {
    if (!foundTransaction) {
      toast.error("No transaction details found");
      return;
    }
  
    validateAndAddPayment({
      item: foundTransaction,
      paymentType: "MPESA",
      balance
    });
    if (!showAmountAlert) {
      setAmount("");
      setMpesaDialogOpen(false);
      setLookupRef("");
      setTransactionFoundDialog(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-4">
      {getPaymentList().map((paymentOption) => (
        <Dialog
          open={mpesaDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (stkPollRef.current) clearInterval(stkPollRef.current);
              setStkLoading(false);
              setStkPhone("");
              setLookupRef("");
            }
            setMpesaDialogOpen(open);
          }}
          key={paymentOption.id}
        >
          <DialogTrigger>
            <Card className="cursor-pointer hover:bg-accent focus:bg-green-500 focus:text-white ">
              <CardHeader className="flex-col items-center justify-center  p-2 ">
                <h6 className="self-start text-left text-xs font-semibold text-muted-foreground"></h6>
                {/* <span className="h-8 w-8 ">{paymentOption.icon}</span> */}
                <h4 className="text-center text-sm font-normal">
                  {paymentOption.title}
                </h4>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{paymentOption.title}</DialogTitle>
              <DialogDescription>
                Select a payment to that matches {amount}.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="all">
              <div className="flex items-center">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="manual">Lookup</TabsTrigger>
                  <TabsTrigger value="stk">STK Push</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all">
                <Card>
                  <CardHeader>
                    <CardDescription>
                      Search using amount or customer name to find payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="no-scrollbar max-h-[200px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex flex-col space-y-3">
                        <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ) : (
                      <DataTable
                        columns={paymentColumns}
                        filCol="TransAmount"
                        data={mpesaPayments}
                        onRowClick={handleMpesaRowClick}
                        searchKey={amount}
                        onRefetch={refetchMpesaPayments}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="manual">
                <Card>
                  <CardHeader>
                    <CardDescription>
                      Search using reference number to find payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="no-scrollbar max-h-[200px] overflow-y-auto">
                    <div className="flex flex-col items-center space-y-2 py-4">
                      <Input
                        value={lookupRef}
                        onChange={(e) => setLookupRef(e.target.value)}
                      />
                      <div className="flex w-full justify-end *:flex-row">
                        <Button
                          disabled={lookupRef === "" || isLoading}
                          onClick={() => handleMpesaLookup()}
                        >
                          {isLoading ? (
                            <>
                              <span className="mr-1">Looking </span>
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </>
                          ) : (
                            <>
                              <SearchCodeIcon className="h-4 w-4" /> Lookup
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="stk">
                <Card>
                  <CardHeader>
                    <CardDescription>
                      Send an STK push prompt to the customer&apos;s phone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="no-scrollbar max-h-[200px] overflow-y-auto">
                    <div className="flex flex-col space-y-3 py-4">
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="07XXXXXXXX"
                        value={stkPhone}
                        onChange={(e) => setStkPhone(e.target.value)}
                        disabled={stkLoading}
                      />
                      <Label>Amount</Label>
                      <Input value={amount || balance} disabled />
                      <div className="flex w-full justify-end">
                        <Button
                          disabled={stkPhone.trim() === "" || stkLoading}
                          onClick={handleStkPush}
                        >
                          {stkLoading ? (
                            <>
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              Waiting...
                            </>
                          ) : (
                            "Send STK Push"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      ))}
      {manualPayments.length > 0 &&
        manualPayments.map((payment, index) => (
          // <Dialog
          //   open={manualDialogOpen}
          //   onOpenChange={setManualDialogOpen}
          //   key={index}
          // >
          // <DialogTrigger>
          <Card
            key={index}
            onClick={() => {
              setManualDialogOpen(true);
              setPaid(payment);
            }}
            className="cursor-pointer hover:bg-accent focus:bg-accent"
          >
            <CardHeader className="flex-col items-center justify-center  p-2 ">
              <h6 className="self-start text-left text-xs font-semibold text-muted-foreground"></h6>
              {/* <span className="h-8 w-8 ">{paymentOption.icon}</span> */}
              <h4 className="text-center text-sm font-normal">
                {payment.bank_account_name}
              </h4>
            </CardHeader>
          </Card>
          // </DialogTrigger>

          // </Dialog>
        ))}

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paid?.bank_account_name}</DialogTitle>
            <DialogDescription>
              Add a payment to that matches {amount}.
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardHeader>
              <CardDescription>Enter Amount Matching {amount}</CardDescription>
            </CardHeader>
            <CardContent className="no-scrollbar max-h-[400px] overflow-y-auto">
              <div className="flex flex-col justify-evenly space-y-4">
                {paid?.ttp.includes("CASH") ? (
                  <></>
                ) : (
                  <div className="flex flex-col justify-evenly space-y-4">
                    <Label> Paid By</Label>
                    <Input
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                    />
                    <Label>Transaction Number</Label>
                    <Input
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                    />
                  </div>
                )}

                <Label>Amount</Label>
                <Input
                  type="number"
                  min={1}
                  value={amnt}
                  onChange={(e) => setAmnt(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center justify-end gap-2 p-4">
                <Button
                  variant={"default"}
                  size={"default"}
                  disabled={paid === null}
                  onClick={() => handleManualSubmit(paid ? paid.ttp : "")}
                >
                  Add Payment
                </Button>
              </div>
              {/* <Input>
                 </Input> */}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      <Dialog
        open={transactionFoundDialog}
        onOpenChange={setTransactionFoundDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Found</DialogTitle>
            <DialogDescription>
              Do you want to proceed with this transaction?
            </DialogDescription>
          </DialogHeader>
          {foundTransaction && (
            <div className="rounded-md border p-4 text-sm space-y-2">
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
          <DialogFooter className="justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                No
              </Button>
            </DialogClose>
            <Button variant="default" onClick={handleTransactionFound}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showAmountAlert}
        onOpenChange={(open) => {
          if (!open) {
            cancelPendingPayment();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Higher Amount Warning</AlertDialogTitle>
            <AlertDialogDescription>
              The payment amount (KES {pendingPayment?.item.TransAmount}) is higher than the remaining balance (KES {pendingPayment?.requiredAmount}). Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPendingPayment}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmPendingPayment();
              setAmount("");
              setMpesaDialogOpen(false);
              setManualDialogOpen(false);
              setTransactionFoundDialog(false);
              toast.success("Payment added successfully");
            }}>
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default PaymentOptions;
