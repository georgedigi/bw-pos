import { useEffect, useState } from "react";
import { useItemDetails } from "~/hooks/useInventory";

interface InventoryItem {
  stock_id: string;
  price: number;
  quantity_available: number;
  tax_mode: number;
  kit?: string | undefined;
}

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

// Check item quantities function with types
export const checkItemQuantities = async (
  items: CartItem[],
  inventory: InventoryItem[]
): Promise<{
  isValid: boolean;
  invalidItems: CartItem[];
}> => {
  const invalidItems: CartItem[] = [];

  if (!Array.isArray(inventory)) {
    console.error("Inventory is not a valid array:", inventory);
    return { isValid: false, invalidItems };
  }

  console.log("Inventory Structure:", inventory);
  console.log("Items being checked:", items);

  for (const item of items) {
    console.log("Checking stock_id:", item.item.stock_id);

    // Search the updated inventory for the item stock_id
    const product = inventory.find(
      (invItem) => invItem.stock_id === item.item.stock_id
    );

    console.log("Found product:", product);

    if (!product || item.quantity > product.quantity_available) {
      console.error(`Invalid quantity for item ${item.item.stock_id}: `, product);
      invalidItems.push(item);
    }
  }
  return { isValid: invalidItems.length === 0, invalidItems };
};

// Utility function to highlight problematic items in the cart with types
export const highlightProblematicItems = (
  items: CartItem[],
  inventory: InventoryItem[]
): CartItem[] => {
  if (!Array.isArray(inventory)) {
    console.error("Inventory is not a valid array:", inventory);
    return [];
  }

  // Find problematic items
  const invalidItems = items.filter(item => {
    const product = inventory.find(invItem => invItem.stock_id === item.item.stock_id);
    return !product || item.quantity > product.quantity_available;
  });

  return invalidItems; // Return the list of problematic items
};


type ItemDetails = {
  stock_id: string;
  price: number;
  quantity_available: number;
  tax_mode: number;
};

export const useFetchAllDetails = (
  inventory: InventoryItem[],
  site_url: string,
  site_company: SiteCompany,
  account: UserAccountInfo,
) => {
  const [allDetails, setAllDetails] = useState<ItemDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllDetails = async () => {
      const detailsArray: ItemDetails[] = [];

      // Fetch details for each item in inventory
      for (const item of inventory) {
        try {
          const { data: details } = useItemDetails(
            site_url,
            site_company,
            account,
            item.stock_id,
            item.kit ?? ""
          );

          if (details) {
            detailsArray.push({
              stock_id: item.stock_id,
              price: details.price,
              quantity_available: details.quantity_available,
              tax_mode: details.tax_mode,
            });
          }
        } catch (err) {
          console.error(`Error fetching details for ${item.stock_id}:`, err);
          setError(`Error fetching details for ${item.stock_id}`);
        }
      }

      // Update state with fetched details
      setAllDetails(detailsArray);
    };

    if (inventory.length > 0) {
      fetchAllDetails().catch((err) => {
        setError("Error fetching all details.");
        console.error("Error fetching all details:", err);
      });
    }
  }, [inventory, site_url, site_company, account]);

  return { allDetails, error };
};


export const saveCartToLocalStorage = (cart: any) => {
  try {
    const serializedCart = JSON.stringify(cart);
    localStorage.setItem("heldCart", serializedCart);
  } catch (error) {
    console.error("Could not save cart to localStorage:", error);
  }
};



//   const handleProcessInvoice = async () => {
//     if (isLoading) {
//       return;
//     }
//     if (!currentCart) {
//       toast.error("Please add items to cart");
//       // setIsLoading(false);
//       return;
//     }
//     if (!currentCustomer) {
//       toast.error("Please select a customer");
//       // setIsLoading(false);
//       return;
//     }

//     if (totalPaid < total - discount || !totalPaid) {
//       toast.error("Insufficient funds");
//       return;
//     }

//     const pmnts = updateCashPayments(paymentCarts, total);
//     console.log("pmnts", pmnts);

//     setIsLoading(true);

//     console.log("currentCart-submit");
//     try {
//       const result = await submit_direct_sale_request(
//         site_url!,
//         site_company!.company_prefix,
//         account!.id,
//         account!.user_id,
//         currentCart.items,
//         currentCustomer,
//         pmnts,
//         currentCustomer.br_name,
//         currentCart.cart_id,
//         pin,
//       );
//       console.log("result", result);
//       if (!result) {
//         // sentry.captureException(result);
//         toast.error("Transaction failed");
//         setIsLoading(false);
//         return;
//       } else if (result && (result as OfflineSalesReceiptInformation).offline) {
//         await addInvoice(result as OfflineSalesReceiptInformation);
//         toast.info("Transaction saved Offline");
//         await handleOfflinePrint(result as UnsynchedInvoice);
//         clearCart();
//         clearPaymentCarts();
//         setPin("");
//         setIsLoading(false);
//         return;
//       } else {
//         // const transaction_history = await fetch_pos_transactions_report(
//         //   site_company!,
//         //   account!,
//         //   site_url!,
//         //   toDate(new Date()),
//         //   toDate(new Date()),
//         // );
//         // process receipt

//         toast.success("Invoice processed successfully");
//         console.log("result", result);

//         //   router.refresh();

//         if (result as SalesReceiptInformation) {
//           await handlePrint(result as SalesReceiptInformation);

//           localStorage.setItem(
//             "transaction_history",
//             JSON.stringify(result as SalesReceiptInformation),
//           );
//           clearCart();
//           clearPaymentCarts();
//           setPaidStatus(true);

//           // router.push("/payment/paid");
//         } else {
//           toast.error("Failed to print - Could not find transaction");
//           setIsPrinted(false);
//         }
//         setPin("");
//       }

//       if (!(result as OfflineSalesReceiptInformation).offline && result) {
//         clearCart();
//         clearPaymentCarts();
//         setPaidStatus(true);
//         // router.push("/payment/paid");
//       }
//       // if (isPrinted) {
//       // }
//     } catch (error) {
//       console.error("Something went wrong", error);
//       toast.error("Something went wrong");
//     } finally {
//       setIsLoading(false);
//     }

//     // clearCart();
//   };