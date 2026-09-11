"use client";
import React, { useEffect, useState } from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { fetch_pos_transactions_report } from "~/lib/actions/user.actions";
import { useAuthStore } from "~/store/auth-store";
import { toDate } from "~/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Separator } from "~/components/ui/separator";
import {
  Banknote,
  Printer,
  ShoppingCart,
  CheckCircle2,
  Receipt,
  AlertCircle,
  TrendingDown,
  Tag,
  Percent
} from "lucide-react";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { usePayStore } from "~/store/pay-store";
import EnhancedTransactionReceiptPDF from "~/hawk-tuah/components/enhancedReceiptPdf";
import { formatMoney } from "~/hawk-tuah/utils/formatters";
import { Alert, AlertDescription } from "~/components/ui/alert";

/**
 * Enhanced Transaction Summary Hook - Uses actual transaction data for 100% accuracy
 */
const useTransactionSummary = (trans: TransactionReportItem | null) => {
  const [summary, setSummary] = useState({
    items: [] as TransactionInvItem[],
    payments: [] as Payment[],
    originalSubtotal: 0,
    subtotalAfterItemDiscounts: 0,
    automaticDiscounts: 0,
    manualDiscounts: 0,
    bulkDiscountAmount: 0,
    finalTotal: 0,
    totalSavings: 0,
    quantity: 0,
    totalPaid: 0,
    change: 0,
    vatAmount: 0,
    isValid: false,
    error: null as string | null
  });

  useEffect(() => {
    if (!trans) {
      setSummary(prev => ({ ...prev, isValid: false, error: "No transaction data available" }));
      return;
    }

    try {
      // Parse transaction items and payments safely
      const items: TransactionInvItem[] = trans.pitems ? JSON.parse(trans.pitems) : [];
      const payments: Payment[] = trans.payments ? JSON.parse(trans.payments) : [];
      console.log("payments response: ", payments);

      // Calculate original subtotal (before any discounts)
      const originalSubtotal = items.reduce((acc, item) => {
        const originalPrice = parseFloat(item.original_price || item.price || "0");
        const quantity = parseInt(item.quantity || "0");
        return acc + (originalPrice * quantity);
      }, 0);

      const quantity = items.reduce((acc, item) => acc + parseInt(item.quantity || "0"), 0);

      // Parse discount summary from the actual transaction data
      let subtotalAfterItemDiscounts = 0;
      let automaticDiscounts = 0;
      let manualDiscounts = 0;
      let bulkDiscountAmount = 0;
      let finalTotal = 0;

      if (trans.discount_summary) {
        try {
          const discountSummary = JSON.parse(trans.discount_summary);
          subtotalAfterItemDiscounts = parseFloat(discountSummary.subtotal || "0");
          automaticDiscounts = parseFloat(discountSummary.automatic_discounts || "0");
          manualDiscounts = parseFloat(discountSummary.manual_discounts || "0");
          bulkDiscountAmount = parseFloat(discountSummary.bulk_discount || "0");
          finalTotal = parseFloat(discountSummary.final_total || trans.ptotal || "0");
        } catch (discountError) {
          console.warn("Could not parse discount summary, calculating from items");
          // Fallback to item-level calculation
          subtotalAfterItemDiscounts = items.reduce((acc, item) => {
            const discountedPrice = parseFloat(item.discounted_price || item.price || "0");
            const quantity = parseInt(item.quantity || "0");
            return acc + (discountedPrice * quantity);
          }, 0);

          automaticDiscounts = items.reduce((acc, item) => {
            return acc + parseFloat(item.automatic_discount || "0");
          }, 0);

          manualDiscounts = items.reduce((acc, item) => {
            return acc + parseFloat(item.manual_discount || "0");
          }, 0);

          finalTotal = parseFloat(trans.ptotal || "0");
          bulkDiscountAmount = subtotalAfterItemDiscounts - finalTotal - manualDiscounts;
        }
      } else {
        // Complete fallback calculation
        subtotalAfterItemDiscounts = items.reduce((acc, item) => {
          const total = parseFloat(item.total || "0");
          return acc + total;
        }, 0);
        finalTotal = parseFloat(trans.ptotal || "0");
      }

      const totalSavings = automaticDiscounts + manualDiscounts + bulkDiscountAmount;

      const change = payments.length > 0 ? parseFloat(payments[0].balance || "0") : 0;
      const totalPaid = finalTotal + change; // Caveman math: what they paid = cost + change....no judgement here punk!
      const vatAmount = parseFloat(trans.vat_amount || "0");

      setSummary({
        items,
        payments,
        originalSubtotal,
        subtotalAfterItemDiscounts,
        automaticDiscounts,
        manualDiscounts,
        bulkDiscountAmount,
        finalTotal,
        totalSavings,
        quantity,
        totalPaid,
        change,
        vatAmount,
        isValid: true,
        error: null
      });

    } catch (error) {
      console.error("Error parsing transaction data:", error);
      setSummary(prev => ({
        ...prev,
        isValid: false,
        error: "Failed to parse transaction data"
      }));
    }
  }, [trans]);

  return summary;
};

/**
 * Enhanced Transaction Summary Component - Uses component theming (CSS variables)
 */
const EnhancedTransactionSummary = ({ summary }: { summary: ReturnType<typeof useTransactionSummary> }) => {
  if (!summary.isValid) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {summary.error || "Unable to load transaction summary"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Items ({summary.quantity})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {summary.items.map((item, index) => (
            <Card key={item.item_option_id || index} className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {item.item_option}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{item.quantity} × {formatMoney(parseFloat(item.original_price || item.price))}</span>
                    {parseFloat(item.automatic_discount || "0") > 0 && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        -{formatMoney(parseFloat(item.automatic_discount))}
                      </span>
                    )}
                    {parseFloat(item.manual_discount || "0") > 0 && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Manual: -{formatMoney(parseFloat(item.manual_discount))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {parseFloat(item.original_price || item.price) !== parseFloat(item.discounted_price || item.price) ? (
                    <div>
                      <p className="text-xs text-muted-foreground line-through">
                        {formatMoney(parseFloat(item.original_price || item.price) * parseInt(item.quantity))}
                      </p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatMoney(parseFloat(item.total || "0"))}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold">
                      {formatMoney(parseFloat(item.total || "0"))}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Payment Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Original Subtotal</span>
          <span className="font-medium">{formatMoney(summary.originalSubtotal)}</span>
        </div>

        {/* Discount Breakdown */}
        {summary.totalSavings > 0 && (
          <Card className="dark:bg-gradient-to-b from-green-50 to-green-100 bg-gradient-to-b border-green-200">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <TrendingDown className="h-4 w-4" />
                Discounts Applied
              </div>

              {summary.automaticDiscounts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Item Discounts
                  </span>
                  <span className="text-green-700 font-medium">-{formatMoney(summary.automaticDiscounts)}</span>
                </div>
              )}

              {summary.manualDiscounts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Manual Discounts
                  </span>
                  <span className="text-green-700 font-medium">-{formatMoney(summary.manualDiscounts)}</span>
                </div>
              )}

              {summary.bulkDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Bulk Discount
                  </span>
                  <span className="text-green-700 font-medium">-{formatMoney(summary.bulkDiscountAmount)}</span>
                </div>
              )}

              <Separator className="bg-green-200" />
              <div className="flex justify-between text-sm font-semibold text-green-800">
                <span>Total Savings</span>
                <span>{formatMoney(summary.totalSavings)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subtotal after discounts */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoney(summary.subtotalAfterItemDiscounts)}</span>
        </div>

        {/* VAT */}
        {summary.vatAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT</span>
            <span className="font-medium">{formatMoney(summary.vatAmount)}</span>
          </div>
        )}

        {/* Final Total */}
        <Card className="bg-primary dark:bg-gradient-to-b from-green-50 to-green-100 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">{formatMoney(summary.finalTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Payment Methods</h4>
          {summary.payments.map((payment, index) => (
            <Card key={payment.TransTime || index} className="bg-blue-50 dark:bg-gradient-to-b from-green-50 to-green-100 border-blue-200">
              <CardContent className="p-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">{payment.Transtype}</span>
                  <span className="font-medium text-blue-900">{formatMoney(parseFloat(payment.TransAmount))}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between text-sm font-semibold pt-2 border-t">
            <span className="text-muted-foreground">Total Paid</span>
            <span>{formatMoney(summary.totalPaid)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Transform function (keeping your existing logic)
const transformToReceiptFormat = (trans: TransactionReportItem): SalesReceiptInformation => {
  return {
    "0": {
      id: trans.id,
      rcp_no: trans.rcp_no,
      ptype: trans.ptype,
      ptotal: trans.ptotal,
      payments: trans.payments,
      pitems: trans.pitems,
      cp: trans.cp || "0_",
      uname: trans.uname,
      uid: trans.uid,
      pdate: trans.pdate,
      print: trans.print || "1",
      customername: trans.customername,
      customerid: trans.customerid,
      booking: trans.booking || "1",
      dispatch: trans.dispatch || "0",
      salepersonId: trans.salepersonId || "0",
      salepersonName: trans.salepersonName || "",
      unique_identifier: trans.unique_identifier,
      cycle_id: trans.cycle_id,
      branch_code: trans.branch_code,
      shift_no: trans.shift_no,
      vat_amount: trans.vat_amount,
      pin: trans.pin || "-",
      offline: trans.offline || "0",
      trans_time: trans.trans_time,
      discount_summary: trans.discount_summary,
      status: trans.status || "1",
      branch_name: trans.branch_name
    },
    message: "Success",
    invNo: trans.rcp_no,
    delNo: trans.rcp_no,
    vat: parseFloat(trans.vat_amount || "0"),
    ttpAuto: null,
    weight: 0,
    posSaleInsertId: parseInt(trans.id),
    qrCode: "",
    qrDate: "",
    controlCode: "",
    middlewareInvoiceNumber: ""
  };
};

const EnhancedPaid = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { site_company, site_url, account, receipt_info } = useAuthStore();
  const { paidStatus, setPaidStatus } = usePayStore();
  const [trans, setTrans] = useState<TransactionReportItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useTransactionSummary(trans);
  // console.log("Transaction Summary:", summary);

  // Get transaction from localStorage as fallback
  const getStoredTransaction = (): SalesReceiptInformation | null => {
    try {
      const tr = localStorage.getItem("transaction_history");
      return tr ? JSON.parse(tr) : null;
    } catch (error) {
      console.error("Error parsing stored transaction:", error);
      return null;
    }
  };

  const storedTransaction = getStoredTransaction();

  const handleFetchLatestTransaction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get from local storage first
      const stored = getStoredTransaction();
      if (stored) {
        setTrans(stored[0]);
        return; // Exit early, don't bother fetching from server
      }

      // If not in storage, fallback to server fetch
      const pos_transactions_report = await fetch_pos_transactions_report(
        site_company!,
        account!,
        site_url!,
        toDate(new Date()),
        toDate(new Date())
      );

      if (pos_transactions_report && pos_transactions_report.length > 0) {
        setTrans(pos_transactions_report[0]);
      } else {
        setError("No transaction data available");
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setError("Failed to load transaction data");
    } finally {
      setIsLoading(false);
    }
  };


  const handlePrint = async (data: TransactionReportItem | SalesReceiptInformation) => {
    try {
      if (isNavigating) {
        localStorage.setItem('pending_print', JSON.stringify(data));
        window.location.href = '/';
        return;
      }

      let receiptData: SalesReceiptInformation;
      if ('0' in data) {
        receiptData = data as SalesReceiptInformation;
      } else {
        receiptData = transformToReceiptFormat(data as TransactionReportItem);
      }

      const pdfBlob = await pdf(
        <EnhancedTransactionReceiptPDF
          data={receiptData}
          receipt_info={receipt_info!}
          account={account!}
          duplicate={true}
        />
      ).toBlob();

      const url = URL.createObjectURL(pdfBlob);

      // Mobile: open in new tab so the browser's native print/share is available
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const newTab = window.open(url, "_blank");
        if (!newTab) {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }

      // Desktop: hidden iframe + print dialog
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      return new Promise<void>((resolve, reject) => {
        iframe.onload = () => {
          const cleanup = () => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }
          };

          try {
            iframe.style.position = "fixed";
            iframe.style.display = "block";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.zIndex = "1000";

            iframe.focus();
            iframe.contentWindow!.print();

            const printTimeout = setTimeout(() => {
              cleanup();
            }, 60000);

            iframe.contentWindow!.onafterprint = () => {
              clearTimeout(printTimeout);
              cleanup();
              resolve();
            };
          } catch (err) {
            cleanup();
            reject(err);
          }
        };

        iframe.src = url;
      });
    } catch (error) {
      console.error("Failed to print document:", error);
      toast.error("Failed to print document");
      throw error;
    }
  };

  const handleNewSale = () => {
    setIsNavigating(true);
    setPaidStatus(false);
    window.location.href = '/';
  };

  const triggerPrint = async () => {
    try {
      if (isNavigating) {
        const printData = storedTransaction || trans;
        if (printData) {
          localStorage.setItem('pending_print', JSON.stringify(printData));
          window.location.href = '/';
        }
        return;
      }

      if (storedTransaction) {
        await handlePrint(storedTransaction);
      } else if (trans) {
        await handlePrint(trans);
      } else {
        toast.error("No transaction data available for printing");
      }
    } catch (error) {
      toast.error("Failed to print receipt");
    }
  };

  // Handle pending prints
  useEffect(() => {
    const pendingPrint = localStorage.getItem('pending_print');
    if (pendingPrint) {
      try {
        const printData = JSON.parse(pendingPrint);
        handlePrint(printData).catch(console.error);
      } catch (error) {
        console.error("Error parsing pending print data:", error);
      } finally {
        localStorage.removeItem('pending_print');
      }
    }
  }, []);

  // Fetch transaction on mount
  useEffect(() => {
    void handleFetchLatestTransaction();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        handleNewSale();
      }
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        void triggerPrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trans, storedTransaction, isNavigating]);

  if (isLoading) {
    return (
      <DashboardLayout title="Payment Received">
        <main className="flex min-h-[100vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading transaction details...</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payment Received">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">

          {/* Left Column - Transaction Summary */}
          <Card className="h-full">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 dark:bg-background text-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Transaction Summary</h2>
                <CheckCircle2 className="h-6 w-6" />
              </div>
              {trans && (
                <div className="space-y-1 text-gray-100">
                  <p className="text-sm">Receipt #{trans.rcp_no}</p>
                  <p className="text-xs">{trans.pdate} • {trans.branch_name}</p>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <EnhancedTransactionSummary summary={summary} />
            </CardContent>
          </Card>

          {/* Right Column - Actions & Change */}
          <div className="space-y-6">

            {/* Change Display */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                    <Banknote className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    Change Due
                  </h3>
                  <p className="text-4xl font-bold text-green-600 mb-6">
                    {formatMoney(summary.change)}
                  </p>
                  <Card className="bg-muted">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Paid</p>
                          <p className="font-semibold">{formatMoney(summary.totalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Due</p>
                          <p className="font-semibold">{formatMoney(summary.finalTotal)}</p>
                        </div>
                      </div>
                      {summary.totalSavings > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" />
                              Customer Saved
                            </span>
                            <span className="text-lg font-bold text-green-600">
                              {formatMoney(summary.totalSavings)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  What would you like to do next?
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className="cursor-pointer hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md border-2 hover:border-primary/20"
                    onClick={() => triggerPrint()}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Printer className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Reprint Receipt</h4>
                          <p className="text-sm text-muted-foreground">Press P</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md border-2 hover:border-primary/20"
                    onClick={handleNewSale}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="bg-green-100 p-3 rounded-full">
                          <ShoppingCart className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">New Sale</h4>
                          <p className="text-sm text-muted-foreground">Press N</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default EnhancedPaid;