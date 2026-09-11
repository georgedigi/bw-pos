"use client";
// import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { Label } from "./ui/label";
// import { Input } from "./ui/input";
import axios from "axios";

import { useCartStore } from "~/store/cart-store";
import {
  // toDate,
  // calculateCartTotal,
  calculateDiscount,
  // cn,
  generateRandomString,
  tallyTotalAmountPaid,
} from "~/lib/utils";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { useAuthStore } from "~/store/auth-store";
import { usePayStore } from "~/store/pay-store";
// import { submit_direct_sale_request } from "~/lib/actions/pay.actions";
import { useRouter } from "next/navigation";
import { Loader2, Trash2Icon } from "lucide-react";
import { Button } from "./ui/button";
// import TransactionReceiptPDF from "./sales-themal-receipt";
import { pdf } from "@react-pdf/renderer";
// import { fetch_pos_transactions_report } from "~/lib/actions/user.actions";
// import { addInvoice } from "~/utils/indexeddb";
// import OfflineTransactionReceiptPDF from "./pdfs/offlineprint";
// import { checkItemQuantities, highlightProblematicItems } from "./temporaryFixes";
import { useInventory, useItemDetails } from "~/hooks/useInventory";
import { EnhancedPaymentSummary, useEnhancedPaymentCalculations } from "~/hawk-tuah/components/enhancedAmountInput";
import { submit_direct_sale_request_enhanced } from "~/hawk-tuah/actions/enhancedSubmission";
import EnhancedTransactionReceiptPDF from "~/hawk-tuah/components/enhancedReceiptPdf";
import { useMediaQuery } from "~/hooks/use-media-query";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  paid: number;
  selectedCustomer: Customer | null;
  pin: string;
  setPin: (pin: string) => void;
}

const AmountInput = ({
  value,
  onChange,
  paid,
  selectedCustomer,
  pin,
  setPin,
}: AmountInputProps) => {
  const { site_company, site_url, account, receipt_info } = useAuthStore();
  const {
    paidStatus,
    paymentCarts,
    removeItemFromPayments,
    clearPaymentCarts,
    setPaidStatus,
  } = usePayStore();

  const totalPaid = tallyTotalAmountPaid(paymentCarts);
  const { currentCart, clearCart, currentCustomer, setCurrentCustomer } =
    useCartStore();
  console.log("Current cart: ", currentCart)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isPrinted, setIsPrinted] = useState<boolean>(false);


  interface CartItem {
    item: {
      stock_id: string;
      description: string;
      rate: string;
      kit: string;
      units: string;
      mb_flag: string;
    };
    quantity: number;
    discount?: string | undefined;
    max_quantity: number;
  }

  type ItemDetails = {
    stock_id: string;
    price: number;
    quantity_available: number;
    tax_mode: number;
  };

  const { inventory, loading: inventoryLoading, error: inventoryError } = useInventory(); // Fetch inventory
  const [allDetails, setAllDetails] = useState<ItemDetails[]>([]);
  // const [detailsError, setDetailsError] = useState<string | null>(null);

  // Function to fetch item details
  const fetchItemDetails = async (
    site_url: string,
    company_prefix: string,
    user_id: string,
    stock_id: string,
    kit: string,
  ) => {
    const form_data = new FormData();
    form_data.append("tp", "getItemPriceQtyTaxWithId");
    form_data.append("it", stock_id);
    form_data.append("cp", company_prefix);
    form_data.append("kit", kit);
    form_data.append("id", user_id);

    try {
      const response = await axios.postForm(`${site_url}process.php`, form_data);
      // console.log("Updated Fetched item details for stock ID:", stock_id, ":", response.data);

      if (response.data === "") {
        console.error(`No data returned for stock ID: ${stock_id}`);
        return null;
      }

      const args = (typeof response.data === 'string' ? response.data : "").split("|");
      // console.log("Fetched item details for stock ID args:", stock_id, ":", args);
      return {
        stock_id,
        price: parseFloat(args[0] ?? "0"),
        quantity_available: parseFloat(args[1] ?? "0"),
        tax_mode: parseInt(args[2] ?? "0", 10),
      };

    } catch (error) {
      console.error(`Error fetching details for stock ID ${stock_id}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchAllItemDetails = async () => {
      if (!inventory || inventory.length === 0) return;

      setIsFetchingDetails(true);

      try {
        const detailPromises = inventory.map(item => {
          return fetchItemDetails(site_url!, site_company!.company_prefix, account!.id, item.stock_id, item.kit ?? "");
        });

        const resolvedDetails = await Promise.all(detailPromises);
        // Filter out null values and set state
        const validDetails = resolvedDetails.filter(detail => detail !== null);
        setAllDetails(validDetails);

        // console.log("Fetched item details:", validDetails);
      } catch (error) {
        console.error("Error fetching item details", error);
      } finally {
        setIsFetchingDetails(false);
      }
    };

    if (inventory.length > 0) {
      void fetchAllItemDetails();
    }
  }, [inventory, site_url, site_company!.company_prefix, account!.id]);


  const checkInventoryForCartItems = async (
    site_url: string,
    company_prefix: string,
    user_id: string,
    items: CartItem[]
  ) => {
    items.forEach((item, index) => {
      console.log(`Checking item: ${item.item.description}, Requested Quantity: ${item.quantity}`);
    });
    // Map through cart items and fetch details in parallel
    const itemDetailsPromises = items.map(item =>
      fetchItemDetails(site_url, company_prefix, user_id, item.item.stock_id, item.item.kit)
    );
    console.log("Items in cart:", itemDetailsPromises);

    // Await all fetch requests and filter out any invalid entries
    const itemDetails = await Promise.all(itemDetailsPromises);
    console.log("Item details fetched:", itemDetails);
    const invalidItems: CartItem[] = [];

    // Check for each item in cart if quantity is sufficient
    items.forEach((item, index) => {
      const details = itemDetails[index];
      if (details && item.quantity > details.quantity_available) {
        invalidItems.push(item);
      }
    });

    return {
      isValid: invalidItems.length === 0,
      invalidItems
    };
  };



  // const { inventory } = useInventory();  
  // const allDetails: ItemDetails[] = [];

  // inventory.forEach(item => {
  //   const { data: details } = useItemDetails(
  //     site_url!,
  //     site_company!,
  //     account!,
  //     item.stock_id,
  //     item.kit ?? ""
  //   );

  //   if (details) {
  //     allDetails.push({
  //       stock_id: item.stock_id,
  //       price: details.price,
  //       quantity_available: details.quantity_available,
  //       tax_mode: details.tax_mode
  //     });
  //   }
  // });

  // console.log("All details", allDetails);

  const router = useRouter();
  const isMobileScreen = useMediaQuery("(max-width: 767px)");

  // const total = calculateCartTotal(currentCart!);
  const discount = calculateDiscount(currentCart!);
  // const balance = total - discount - paid;
  const calculations = useEnhancedPaymentCalculations();
  const total = calculations.finalTotal;
  const balance = total - paid;

  useEffect(() => {
    setCurrentCustomer(selectedCustomer);
  }, [selectedCustomer]);

  useEffect(() => {
    if (!currentCart && !paidStatus) {
      router.push("/");
    } else if (!currentCart && paidStatus) {
      router.push("/payment/paid");
    }
  }, [currentCart, router, paidStatus]);

  // Auto-submit on mobile when balance is fully paid
  useEffect(() => {
    if (!isMobileScreen) return;
    if (isLoading) return;
    if (!currentCart || !currentCustomer) return;
    if (!totalPaid || totalPaid < calculations.finalTotal) return;
    if (totalPaid <= 0) return;

    // Auto-process on mobile when fully paid
    console.log("Mobile auto-submit triggered: totalPaid =", totalPaid, "finalTotal =", calculations.finalTotal);
    void handleProcessInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPaid, calculations.finalTotal, isMobileScreen]);

  // const updateCashPayments = (
  //   paymentCart: PaymentCart[],
  //   invoiceTotal: number,
  // ): PaymentCart[] => {
  //   console.log("paymentCart", paymentCart);
  //   console.log("invoiceTotal", invoiceTotal);
  //   return paymentCart.map((cart) => {
  //     if (cart.paymentType?.includes("CASH")) {
  //       const totalCashPayments = cart.payments.reduce((total, payment) => {
  //         return total + typeof payment.TransAmount === "string"
  //           ? parseFloat(payment.TransAmount as string)
  //           : parseFloat(payment.TransAmount.toString());
  //       }, 0);

  //       console.log("totalCashPayments", totalCashPayments);
  //       const otherpayments = paymentCart.filter(
  //         (payment) => !payment.paymentType?.includes("CASH"),
  //       );

  //       // export const tallyTotalAmountPaid = (
  //       //   paymentCarts: PaymentCart[],
  //       // ): number => {
  //       //   return paymentCarts.reduce((total, cart) => {
  //       //     const cartTotal = cart.payments.reduce((cartSum, payment) => {
  //       //       const amount =
  //       //         typeof payment.TransAmount === "string"
  //       //           ? parseFloat(payment.TransAmount)
  //       //           : payment.TransAmount;
  //       //       return cartSum + (isNaN(amount) ? 0 : amount);
  //       //     }, 0);
  //       //     return total + cartTotal;
  //       //   }, 0);
  //       // };

  //       const totalOtherPayments = otherpayments.reduce((total, payment) => {
  //         const totals = payment.payments.reduce((total, payment) => {
  //           return total + typeof payment.TransAmount === "string"
  //             ? parseFloat(payment.TransAmount as string)
  //             : parseFloat(payment.TransAmount.toString());
  //         }, 0);
  //         return total + totals;
  //       }, 0);

  //       console.log("otherpayments", otherpayments);
  //       console.log("totalOtherPayments", totalOtherPayments);
  //       console.log("newCash", invoiceTotal - totalOtherPayments);
  //       console.log("cart", cart);

  //       if (totalCashPayments > invoiceTotal) {
  //         const updatedPayments: Payment[] = [
  //           {
  //             Auto: generateRandomString(6),
  //             name: generateRandomString(6),
  //             TransID: ` CASH ${generateRandomString(4)}`,
  //             TransAmount: (invoiceTotal - totalOtherPayments).toString(),
  //             TransTime: new Date().toISOString(),
  //             Transtype: cart.paymentType,
  //             balance: totalCashPayments - invoiceTotal,
  //           },
  //         ];

  //         return {
  //           ...cart,
  //           payments: updatedPayments,
  //         };
  //       }
  //     }

  //     return cart;
  //   });
  // };

  const updateCashPayments = (
    paymentCart: PaymentCart[],
    invoiceTotal: number,
  ): PaymentCart[] => {
    console.log("paymentCart", paymentCart);
    console.log("invoiceTotal", invoiceTotal);

    return paymentCart.map((cart) => {
      if (cart.paymentType?.includes("CASH")) {
        const totalCashPayments = cart.payments.reduce((total, payment) => {
          const amount =
            typeof payment.TransAmount === "string"
              ? parseFloat(payment.TransAmount)
              : parseFloat(payment.TransAmount.toString());
          return total + (isNaN(amount) ? 0 : amount);
        }, 0);

        console.log("totalCashPayments", totalCashPayments);

        // Filter out other payment types that are not 'CASH'
        const otherPayments = paymentCart.filter(
          (payment) => !payment.paymentType?.includes("CASH"),
        );

        // Calculate the total for non-cash payments
        const totalOtherPayments = otherPayments.reduce((total, payment) => {
          const totals = payment.payments.reduce((total, payment) => {
            const amount =
              typeof payment.TransAmount === "string"
                ? parseFloat(payment.TransAmount)
                : parseFloat(payment.TransAmount.toString());
            return total + (isNaN(amount) ? 0 : amount);
          }, 0);
          return total + totals;
        }, 0);

        console.log("otherPayments", otherPayments);
        console.log("totalOtherPayments", totalOtherPayments);

        // Calculate the new cash payment value based on invoice total
        const newCashAmount = invoiceTotal - totalOtherPayments;

        console.log("newCashAmount", newCashAmount);
        console.log("cart", cart);

        if (totalCashPayments + totalOtherPayments > invoiceTotal) {
          // If total payments exceed invoice total, calculate the balance
          const totalPaid = totalCashPayments + totalOtherPayments;
          const overPayment = totalPaid - invoiceTotal;
          const adjustedCashAmount = newCashAmount > 0 ? newCashAmount : 0;

          console.log("overPayment", overPayment);
          console.log("adjustedCashAmount", adjustedCashAmount);

          const updatedPayments: Payment[] = [
            {
              Auto: generateRandomString(6),
              name: generateRandomString(6),
              TransID: ` CASH ${generateRandomString(4)}`,
              TransAmount: adjustedCashAmount.toString(),
              TransTime: new Date().toISOString(),
              Transtype: cart.paymentType,
              balance: overPayment, // The balance should reflect the overpayment
            },
          ];

          return {
            ...cart,
            payments: updatedPayments,
          };
        }
      }

      return cart;
    });
  };

  // const handleProcessInvoice = async () => {
  //   if (isLoading) {
  //     return;
  //   }

  //   if (!currentCart) {
  //     toast.error("Please add items to cart");
  //     return;
  //   }

  //   if (!currentCustomer) {
  //     toast.error("Please select a customer");
  //     return;
  //   }

  //   if (totalPaid < total - discount || !totalPaid) {
  //     toast.error("Insufficient funds");
  //     return;
  //   }

  //   // Check item quantities in the cart based on available inventory
  //   const { isValid, invalidItems = [] } = await checkItemQuantities(currentCart.items, allDetails);
  //   console.log("quantitiesAreValid:", isValid);
  //   console.log("currentCart.items:", currentCart.items);

  //   if (!isValid) {
  //     // Highlight problematic items in the cart
  //     highlightProblematicItems(currentCart.items, allDetails);

  //     // Create an error message listing the problematic items
  //     const invalidItemsMessage = invalidItems
  //       .map(item => `${item.item.description} (Requested: ${item.quantity})`)
  //       .join(", ");

  //     // Show a toast error with the problematic items
  //     toast.error(`Error! Quantities are insufficient for the following items: ${invalidItemsMessage}`);
  //     return; // Stop the process if quantities are invalid
  //   }

  //   const pmnts = updateCashPayments(paymentCarts, total);
  //   console.log("pmnts", pmnts);

  //   setIsLoading(true);

  //   console.log("currentCart-submit");
  //   try {
  //     const result = await submit_direct_sale_request(
  //       site_url!,
  //       site_company!.company_prefix,
  //       account!.id,
  //       account!.user_id,
  //       currentCart.items,
  //       currentCustomer,
  //       pmnts,
  //       currentCustomer.br_name,
  //       currentCart.cart_id,
  //       pin,
  //     );
  //     console.log("result", result);

  //     if (!result) {
  //       toast.error("Transaction failed");
  //       setIsLoading(false);
  //       return;
  //     } else if (result && (result as OfflineSalesReceiptInformation).offline) {
  //       await addInvoice(result as OfflineSalesReceiptInformation);
  //       toast.info("Transaction saved Offline");
  //       await handleOfflinePrint(result as UnsynchedInvoice);
  //       clearCart();
  //       clearPaymentCarts();
  //       setPin("");
  //       setIsLoading(false);
  //       return;
  //     } else {
  //       toast.success("Invoice processed successfully");
  //       console.log("result", result);

  //       if (result as SalesReceiptInformation) {
  //         await handlePrint(result as SalesReceiptInformation);

  //         localStorage.setItem(
  //           "transaction_history",
  //           JSON.stringify(result as SalesReceiptInformation),
  //         );
  //         clearCart();
  //         clearPaymentCarts();
  //         setPaidStatus(true);
  //       } else {
  //         toast.error("Failed to print - Could not find transaction");
  //         setIsPrinted(false);
  //       }
  //       setPin("");
  //     }

  //     if (!(result as OfflineSalesReceiptInformation).offline && result) {
  //       clearCart();
  //       clearPaymentCarts();
  //       setPaidStatus(true);
  //     }
  //   } catch (error) {
  //     console.error("Something went wrong", error);
  //     toast.error("Something went wrong");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  const [submissionError, setSubmissionError] = useState<string | null>(null); // State for error messages

  // const handleProcessInvoice = async () => {
  //   if (isLoading) return;

  //   const perfMetrics = {
  //     validation: 0,
  //     paymentProcessing: 0,
  //     apiRequest: 0,
  //     printTime: 0,
  //     cleanup: 0,
  //     total: 0
  //   };

  //   const transactionStart = performance.now();
  //   const requestId = generateRandomString(8); // Unique ID for this transaction

  //   try {
  //     console.group(`Transaction ${requestId}`);
  //     console.time(`Total Transaction ${requestId}`);

  //     // Start validation timing
  //     const validationStart = performance.now();

  //     // Enhanced validation with payload checking
  //     const validationResults = {
  //       cart: Boolean(currentCart),
  //       cartItems: currentCart?.items?.length > 0,
  //       customer: Boolean(currentCustomer),
  //       payment: Boolean(totalPaid && totalPaid >= total - discount)
  //     };

  //     console.log('Validation Results:', validationResults);

  //     if (!validationResults.cart || !validationResults.cartItems) {
  //       toast.error("Your cart is empty. Please add items to proceed.");
  //       throw new Error("Cart validation failed: Empty cart");
  //     }
  //     if (!validationResults.customer) {
  //       toast.error("Please select a customer.");
  //       throw new Error("Cart validation failed: No customer selected");
  //     }
  //     if (!validationResults.payment) {
  //       toast.error("Insufficient payment. Please check the total amount.");
  //       throw new Error("Cart validation failed: Insufficient funds");
  //     }

  //     perfMetrics.validation = performance.now() - validationStart;
  //     console.log(`Validation completed in ${perfMetrics.validation.toFixed(2)}ms`);

  //     setIsLoading(true);

  //     // Payment processing timing
  //     const paymentStart = performance.now();
  //     const payments = updateCashPayments(paymentCarts, total);
  //     perfMetrics.paymentProcessing = performance.now() - paymentStart;

  //     // Log payment details for debugging
  //     console.log('Payment Details:', {
  //       totalAmount: total,
  //       discount,
  //       totalPaid,
  //       paymentCount: payments.length,
  //       paymentTypes: payments.map(p => p.paymentType)
  //     });

  //     // API request with detailed logging
  //     const apiStart = performance.now();
  //     console.time(`API Request ${requestId}`);

  //     // Calculate payload size
  //     const requestPayload = {
  //       siteUrl: site_url,
  //       companyPrefix: site_company?.company_prefix,
  //       accountId: account?.id,
  //       userId: account?.user_id,
  //       items: currentCart.items,
  //       customer: currentCustomer,
  //       payments,
  //       brName: currentCustomer.br_name,
  //       cartId: currentCart.cart_id,
  //       pin
  //     };

  //     const payloadSize = new Blob([JSON.stringify(requestPayload)]).size;
  //     console.log(`Request Payload Size: ${(payloadSize / 1024).toFixed(2)}KB`);

  //     const result = await Promise.race([
  //       submit_direct_sale_request(
  //         site_url!,
  //         site_company!.company_prefix,
  //         account!.id,
  //         account!.user_id,
  //         currentCart.items,
  //         currentCustomer,
  //         payments,
  //         currentCustomer.br_name,
  //         currentCart.cart_id,
  //         pin
  //       ),
  //       new Promise((_, reject) =>
  //         setTimeout(() => reject(new Error('API request timeout after 60s')), 60000)
  //       )
  //     ]);

  //     console.timeEnd(`API Request ${requestId}`);
  //     perfMetrics.apiRequest = performance.now() - apiStart;

  //     // Log response details
  //     const responseSize = new Blob([JSON.stringify(result)]).size;
  //     console.log(`Response Size: ${(responseSize / 1024).toFixed(2)}KB`);
  //     console.log('API Response:', result);

  //     if (!result) {
  //       throw new Error('API returned null or undefined result');
  //     }

  //     if (result?.status === "FAILED") {
  //       throw new Error(`Submission error: ${result.reason || "No reason provided"}`);
  //     }

  //     // Success path
  //     toast.success("Invoice processed successfully");
  //     setPaidStatus(true);

  //     // Print handling with timing
  //     const printStart = performance.now();
  //     console.time(`Print Operation ${requestId}`);

  //     await new Promise(resolve => setTimeout(resolve, 100));
  //     await handlePrint(result);

  //     console.timeEnd(`Print Operation ${requestId}`);
  //     perfMetrics.printTime = performance.now() - printStart;

  //     // Cleanup timing
  //     const cleanupStart = performance.now();
  //     console.time(`Cleanup Operations ${requestId}`);

  //     await Promise.all([
  //       localStorage.setItem("transaction_history", JSON.stringify(result)),
  //       (async () => {
  //         try {
  //           await clearCart();
  //           await clearPaymentCarts();
  //           setPin("");
  //           setSubmissionError(null);
  //         } catch (cleanupError) {
  //           console.error('Cleanup operation failed:', cleanupError);
  //         }
  //       })()
  //     ]);

  //     console.timeEnd(`Cleanup Operations ${requestId}`);
  //     perfMetrics.cleanup = performance.now() - cleanupStart;

  //   } catch (error) {
  //     console.error("Process invoice error:", {
  //       error,
  //       requestId,
  //       perfMetrics,
  //       state: {
  //         cart: Boolean(currentCart),
  //         customer: Boolean(currentCustomer),
  //         payments: paymentCarts.length
  //       }
  //     });

  //     const errorMessage = error instanceof Error
  //       ? `Error: ${error.message}`
  //       : "Unexpected error occurred";

  //     setSubmissionError(errorMessage);
  //     toast.error(errorMessage);

  //   } finally {
  //     perfMetrics.total = performance.now() - transactionStart;

  //     // Log final performance metrics
  //     console.log('Performance Metrics:', {
  //       ...perfMetrics,
  //       totalTimeSeconds: (perfMetrics.total / 1000).toFixed(2)
  //     });

  //     console.log('Time Distribution:', {
  //       validation: `${((perfMetrics.validation / perfMetrics.total) * 100).toFixed(2)}%`,
  //       paymentProcessing: `${((perfMetrics.paymentProcessing / perfMetrics.total) * 100).toFixed(2)}%`,
  //       apiRequest: `${((perfMetrics.apiRequest / perfMetrics.total) * 100).toFixed(2)}%`,
  //       printTime: `${((perfMetrics.printTime / perfMetrics.total) * 100).toFixed(2)}%`,
  //       cleanup: `${((perfMetrics.cleanup / perfMetrics.total) * 100).toFixed(2)}%`
  //     });

  //     console.groupEnd();
  //     setIsLoading(false);
  //   }
  // };

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

  const handleProcessInvoice = async () => {
    if (isLoading) return;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timed out after 60 seconds'));
      }, 45000);
    });

    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Transaction in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    try {
      // Validation Checks with Enhanced Messages
      if (!currentCart) {
        toast.error("Your cart is empty. Please add items to proceed.");
        throw new Error("Cart is empty.");
      }
      if (!currentCustomer) {
        toast.error("Please select a customer.");
        throw new Error("Customer not selected.");
      }
      if (!totalPaid || totalPaid < calculations.finalTotal) {
        toast.error("Insufficient payment. Please check the total amount.");
        throw new Error("Insufficient funds.");
      }

      setIsLoading(true);
      window.addEventListener("beforeunload", beforeUnloadHandler);

      // Finalize payments for submission
      // const payments = updateCashPayments(paymentCarts, total);
      const payments = updateCashPayments(paymentCarts, calculations.finalTotal);
      // console.log("Payments to be submitted:", payments);

      const startApiTime = Date.now();

      // Wrap the API call in a Promise.race with the timeout
      const result = await Promise.race([
        submit_direct_sale_request_enhanced(  // ✅ NEW ENHANCED FUNCTION
          site_url!,
          site_company!.company_prefix,
          account!.id,
          account!.user_id,
          currentCart.items,
          currentCustomer,
          payments,
          currentCustomer.br_name,
          currentCart.cart_id,
          pin
        ),
        timeoutPromise
      ]);

      const endApiTime = Date.now();
      console.log("Api Request Time: ", startApiTime - endApiTime);

      // Type guard to ensure result is of correct type
      if (!result || typeof result !== 'object') {
        toast.error("Invalid response received from server");
        throw new Error("Invalid response from server");
      }

      const response = result as ServerResponse;

      console.log('Server response:', response);

      // Check for Failed status first
      if (response.status?.toLowerCase() === 'failed') {
        const errorMessage = response.Message || response.reason || "Transaction failed";

        // Handle duplicate cart ID case
        if (errorMessage.includes("Unique Identifier already Exist")) {
          toast.error("This cart has already been processed. Please create a new cart.");
          cleanupAfterInvoice(); // Clear the cart if it's a duplicate submission
        } else {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      // Success case - check for 'Success' status or message
      if (response.status?.toLowerCase() === 'success' ||
        response.message?.toLowerCase() === 'success' ||
        response.Message?.toLowerCase() === 'success') {
        toast.success("Invoice processed successfully");
        setPaidStatus(true);
        localStorage.setItem("transaction_history", JSON.stringify(response));

        try {
          const startPrintTime = Date.now();
          await handlePrint(response as SalesReceiptInformation);
          const endPrintTime = Date.now();
          console.log("Total Print Time:", startPrintTime - endPrintTime);
        } catch (printError) {
          console.error("Print error:", printError);
          toast.error("Invoice processed but printing failed. You can reprint from transaction history.");
        } finally {
          // Always clean up after successful transaction, regardless of print status
          cleanupAfterInvoice();
          setSubmissionError(null);
        }
      } else {
        // Unexpected response status
        const errorMessage = response.Message || response.reason || "Transaction failed, please check your network connection";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error("Process invoice error:", error);
      let errorMessage = "Unexpected error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
        // Special handling for timeout error
        if (error.message === 'Request timed out after 45 seconds') {
          toast.error("The request timed out. Please try again.");
          // cleanupAfterInvoice(); 
        } else {
          toast.error(errorMessage);
        }
      }

      setSubmissionError(errorMessage);
    } finally {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      setIsLoading(false);
    }
  };

  // Cleanup function to reset cart and payment state
  const cleanupAfterInvoice = () => {
    clearCart();
    clearPaymentCarts();
    setPin("");
  };

  // Check if device is mobile (screen width < 768px)
  const isMobile = () => {
    return window.innerWidth < 768;
  };

  // Download PDF file
  const downloadPdf = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = async (data: SalesReceiptInformation) => {
    try {
      console.log("handlePrint", data);
      setPaidStatus(true);

      // Generate PDF for printing/downloading
      const pdfBlob = await pdf(
        <EnhancedTransactionReceiptPDF 
          data={data}
          receipt_info={receipt_info!}
          account={account!}
          duplicate={true}
        />
      ).toBlob();

      // On mobile devices, download the PDF instead of using iframe print
      if (isMobile()) {
        const invNo = data.invNo || `invoice_${Date.now()}`;
        downloadPdf(pdfBlob, `receipt_${invNo}.pdf`);
        toast.success("Receipt downloaded. Check your downloads folder.");
        setIsPrinted(true);
        return;
      }

      // Desktop: use iframe print approach
      const url = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement("iframe");

      // Styling and positioning for print preview
      iframe.style.position = "fixed";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.zIndex = "1000";
      iframe.src = url;
      document.body.appendChild(iframe);

      // Load the iframe, wait a bit, and trigger print
      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.focus();
            iframe.contentWindow.print();
            iframe.contentWindow.onafterprint = () => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
              setIsPrinted(true);
            };
          } else {
            console.warn("Iframe contentWindow is not accessible.");
          }
        }, 100); // Increase delay if necessary
      };

      // Fallback cleanup if onafterprint fails
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          setIsPrinted(true);
          window.location.reload();
        }
      }, 50000);

    } catch (error) {
      console.error("Failed to print document:", error);
      toast.error("Failed to print document. You can reprint from transaction history.");
      setIsPrinted(false);
    }
  };


  // const handleOfflinePrint = async (data: UnsynchedInvoice) => {
  //   try {
  //     console.log("handlePrint", data);
  //     setPaidStatus(true);

  //     const pdfBlob = await pdf(
  //       <OfflineTransactionReceiptPDF
  //         data={data}
  //         receipt_info={receipt_info!}
  //         account={account!}
  //         duplicate={true}
  //       />,
  //     ).toBlob();
  //     const url = URL.createObjectURL(pdfBlob);
  //     const iframe = document.createElement("iframe");
  //     iframe.style.position = "fixed";
  //     iframe.style.width = "100%";
  //     iframe.style.height = "100%";
  //     iframe.style.zIndex = "1000";
  //     iframe.src = url;
  //     document.body.appendChild(iframe);

  //     iframe.onload = () => {
  //       iframe.focus();
  //       iframe.contentWindow!.print();
  //       iframe.contentWindow!.onafterprint = () => {
  //         document.body.removeChild(iframe);
  //         URL.revokeObjectURL(url); // Revoke the URL to free up resources
  //         setIsPrinted(true);
  //       };
  //     };
  //   } catch (error) {
  //     console.error("Failed to print document:", error);
  //     toast.error("Failed to print document");
  //     setIsPrinted(false);
  //   }
  // };

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex-grow">

        {/* <div className="flex w-full flex-col space-y-4 py-4">
          <Label className="text-xl">Payment</Label>
          <div className="flex w-full flex-row justify-between">
            <span>SubTotal</span>
            <span className="font-semibold">KES {total - discount}</span>
          </div>
          <div className="flex w-full flex-row justify-between gap-6">
            <span className="flex-row py-4">Amount</span>
            <span className="flex-grow">
              <Input
                type="text"
                id="cart-payment"
                placeholder={value}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-14 border-gray-700 bg-transparent px-1 text-right text-xl shadow-none"
              />
            </span>
          </div>
          <Separator className="my-4" />
          <div className="flex w-full flex-row justify-between">
            <span>Balance</span>
            <span
              className={cn(
                "font-semibold",
                balance > 0 ? "text-red-700" : "text-green-800",
              )}
            >
              KES {total - discount - paid}
            </span>
          </div>
        </div> */}

        <div className="flex w-full flex-col space-y-4 py-4">
          <Label className="text-xl">Payment</Label>
          <EnhancedPaymentSummary
            paid={paid}
            value={value}
            onChange={onChange}
          />
          <Separator className="my-4" />
        </div>

        <div className="flex w-full flex-col space-y-2">
          <div className="font-semibold">Payment Details</div>
          {paymentCarts.map((cart, index) => (
            <ul key={index} className="grid w-full gap-3">
              <li className="flex items-center">
                <span className="font-medium text-gray-600">
                  {cart.paymentType}
                </span>
              </li>
              {cart.payments.map((detail, index) => (
                <ul key={index} className="grid w-full gap-3 font-normal">
                  <li className="flex w-full items-center justify-between space-x-4 px-2">
                    <span className="text-muted-foreground">
                      {detail.TransID}
                    </span>
                    <span className="flex-grow overflow-hidden text-clip text-center">
                      {detail.name}
                    </span>
                    <span className="text-right">{detail.TransAmount}</span>
                    <span className="text-right">
                      <Trash2Icon
                        onClick={() =>
                          removeItemFromPayments(
                            cart.paymentType!,
                            detail.TransID,
                          )
                        }
                        className="h-6 w-6 cursor-pointer text-red-600 hover:h-4 hover:w-4"
                      />
                    </span>
                  </li>
                </ul>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <div className="flex w-full justify-end px-6">
        <Button
          onClick={handleProcessInvoice}
          variant={"default"}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> &nbsp;
            </>
          ) : (
            <>Submit</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AmountInput;