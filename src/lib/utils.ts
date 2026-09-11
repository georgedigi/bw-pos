import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { type ColumnDef } from "@tanstack/react-table";
import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1 < 10 ? "0" : ""}${date.getMonth() + 1}`;
  const day = `${date.getDate() < 10 ? "0" : ""}${date.getDate()}`;

  return `${year}-${month}-${day}`;
}

export const authFormSchema = () =>
  z
    .object({
      // sign in
      site_name: z
        .string({
          required_error: "Please enter Site name.",
        })
        .min(1, {
          message: "Please enter site name.",
        }),
      username: z
        .string({
          required_error: "Please Enter UserName.",
        })
        .min(1, {
          message: "Please enter valid username.",
        }),
      password: z.string({
        required_error: "Please Enter Password.",
      }),
    })
    .required();

export const clearanceFormSchema = () =>
  z.object({
    shift_no: z.string().min(1, { message: "Please enter shift number." }),
    user_id: z.string().min(1, { message: "Please enter user id." }),
    collections: z
      .array(
        z.object({
          payment_mode: z
            .string()
            .min(1, { message: "Please enter payment mode." }),
          amount: z.string().min(1, { message: "Please enter amount." }),
        }),
      )
      .min(1, { message: "Please enter collections." }),
  });

export function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const calculateCartTotal = (cart: Cart): number => {
  if (!cart) return 0;
  return cart.items.reduce((total, cartItem) => {
    return total + cartItem.quantity * cartItem.details.price;
  }, 0);
};

export const calculateDiscount = (cart: Cart): number => {
  if (!cart) return 0;
  return cart.items.reduce((total, cartItem) => {
    return total + parseInt(cartItem.discount ?? "0.00");
  }, 0);
};

export const tallyTotalAmountPaid = (paymentCarts: PaymentCart[]): number => {
  return paymentCarts.reduce((total, cart) => {
    const cartTotal = cart.payments.reduce((cartSum, payment) => {
      const amount =
        typeof payment.TransAmount === "string"
          ? parseFloat(payment.TransAmount)
          : payment.TransAmount;
      return cartSum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return total + cartTotal;
  }, 0);
};

export function removeSpecialCharacters(input: string): string {
  return input.replace(/[^\w\s]/g, " ");
}
export const paymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: "TransID",
    header: "RefNo",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "TransAmount",
    header: "Amnt",
  },
];

export const posFilterFields: DataTableFilterField<TransactionReportItem>[] = [
  {
    label: "Payment Type",
    value: "ptype",
    placeholder: "Filter by Payment Type",
    options: [
      { label: "Cash", value: "Cash" },
      { label: "Cheque", value: "Cheque" },
      { label: "Credit Card", value: "Credit Card" },
      { label: "Debit Card", value: "Debit Card" },
      { label: "Other", value: "Other" },
    ],
  },
  {
    label: "Item Category",
    value: "pitems",
    placeholder: "Filter by Item Category",
    // modify options based on Item Category
    options: [
      { label: "Food", value: "Food" },
      { label: "Clothing", value: "Clothing" },
      { label: "Electronics", value: "Electronics" },
      { label: "Home", value: "Home" },
      { label: "Other", value: "Other" },
    ],
  },
];
// export const inventoryColumns: ColumnDef<StockItem>[] = [
//   {
//     accessorKey: "stock_id",
//     header: "Item Code",
//   },
//   {
//     accessorKey: "item",
//     header: "Item Name",
//   },
//   {
//     accessorKey: "balance",
//     header: "Balance",
//   },
//   {
//     id: "actions",
//   },
// ];

// export const salesReportColumns: ColumnDef<SalesReportItem>[] = [
//   {
//     accessorKey: "stock_id",
//     header: "Item Code",
//     footer: "Total",
//   },
//   {
//     accessorKey: "category_name",
//     header: "Category",
//   },

//   {
//     accessorKey: "parent_item",
//     header: "Item Type",
//   },
//   {
//     accessorKey: "description",
//     header: "Item Name",
//   },
//   {
//     accessorKey: "unit_price",
//     header: "Unit Price",
//   },
//   {
//     accessorKey: "quantity",
//     header: "Quantity",
//   },
//   {
//     id: "total",
//     header: "Total",
//     cell: (props) => {
//       const row = props.row.original;
//       const rowTotal = parseInt(row.quantity) * parseFloat(row.unit_price);
//       return React.createElement(
//         "span",
//         { className: "text-right" },
//         rowTotal.toFixed(2),
//       );
//     },
//     footer: (props) => {
//       const total = props.table.getCoreRowModel().rows.reduce((sum, row) => {
//         const rowData = row.original;
//         return (
//           sum + parseInt(rowData.quantity) * parseFloat(rowData.unit_price)
//         );
//       }, 0);
//       return React.createElement(
//         "span",
//         { className: "text-right" },
//         total.toFixed(2),
//       );
//     },
//   },
// ];
// Sample usage
export const salesReportColumns: ColumnDef<SalesReportItem>[] = [
  {
    id: "stock_id",
    accessorKey: "stock_id",
    header: "Item Code",
    footer: "Total",
    cell: (props) => props.getValue(),
  },
  {
    id: "category_name",
    accessorKey: "category_name",
    header: "Category",
    cell: (props) => props.getValue(),
  },
  {
    id: "parent_item",
    accessorKey: "parent_item",
    header: "Item Type",
    cell: (props) => props.getValue(),
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Item Name",
    cell: (props) => props.getValue(),
  },
  {
    id: "unit_price",
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: (props) => props.getValue(),
  },
  {
    id: "quantity",
    accessorKey: "quantity",
    header: "Quantity",
    cell: (props) => props.getValue(),
  },
  {
    id: "total",
    header: "Total",
    cell: (props) => {
      const row = props.row.original;
      const rowTotal = parseInt(row.quantity) * parseFloat(row.unit_price);
      return rowTotal.toFixed(2);
    },
    footer: (props) => {
      const total = props.table.getCoreRowModel().rows.reduce((sum, row) => {
        const rowData = row.original;
        return (
          sum + parseInt(rowData.quantity) * parseFloat(rowData.unit_price)
        );
      }, 0);
      return total.toFixed(2);
    },
  },
];
export const generalSalesReportColumns: ColumnDef<GeneralSalesReportItem>[] = [
  {
    id: "receipt_no",
    accessorKey: "receipt_no",
    header: "Item Code",
    cell: (props) => props.getValue(),
  },
  {
    id: "trans_time",
    accessorKey: "trans_time",
    header: "Date",
    cell: (props) => props.getValue(),
  },

  {
    id: "description",
    accessorKey: "description",
    header: "Item Name",
    cell: (props) => props.getValue(),
  },
  {
    id: "location_name",
    accessorKey: "location_name",
    header: "Branch",
    cell: (props) => props.getValue(),
  },
  {
    id: "user_id",
    accessorKey: "user_id",
    header: "User",
    cell: (props) => props.getValue(),
  },
  {
    id: "unit_price",
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: (props) => props.getValue(),
  },
  {
    id: "quantity",
    accessorKey: "quantity",
    header: "Quantity",
    cell: (props) => props.getValue(),
    footer: (props) => {
      const total = props.table.getCoreRowModel().rows.reduce((sum, row) => {
        const rowData = row.original;
        return sum + parseInt(rowData.quantity);
      }, 0);
      return total.toFixed(2);
    },
  },
  {
    id: "total",
    header: "Total Sales Amount",
    cell: (props) => {
      const row = props.row.original;
      const rowTotal = parseInt(row.quantity) * parseFloat(row.unit_price);
      return rowTotal.toFixed(2);
    },
    footer: (props) => {
      const total = props.table.getCoreRowModel().rows.reduce((sum, row) => {
        const rowData = row.original;
        return (
          sum + parseInt(rowData.quantity) * parseFloat(rowData.unit_price)
        );
      }, 0);
      return total.toFixed(2);
    },
  },
];
export const CollectionsReportColumns: ColumnDef<CollectionReportItem>[] = [
  {
    id: "trans_time",
    accessorKey: "trans_time",
    header: "Date",
    cell: (props) => props.getValue(),
  },
  {
    id: "collection_no",
    accessorKey: "id",
    header: "Collection No",
    cell: (props) => props.getValue(),
  },

  {
    id: "user_id",
    accessorKey: "user_id",
    header: "User",
    cell: (props) => props.getValue(),
  },
  {
    id: "shift_no",
    accessorKey: "shift_no",
    header: "Shift",
    cell: (props) => props.getValue(),
  },
  {
    id: "pay_mode",
    accessorKey: "pay_mode",
    header: "Payment Mode",
    cell: (props) => props.getValue(),
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: (props) => props.getValue(),
  },
];

export const posTransactionColumns: ColumnDef<any>[] = [
  {
    id: "transactionId",
    accessorKey: "transactionId",
    header: "TransNo",
  },
  {
    id: "uid",
    accessorKey: "uid",
    header: "CASHIER_ID",
  },
  {
    id: "uname",
    accessorKey: "uname",
    header: "CASHIER",
  },
  {
    id: "customerid",
    accessorKey: "customerid",
    header: "CUSTOMER_ID",
  },
  {
    id: "customername",
    accessorKey: "customername",
    header: "CUSTOMER_NAME",
  },
  {
    id: "branch_name",
    accessorKey: "branch_name",
    header: "LOCATION",
  },
  {
    id: "item_option",
    accessorKey: "item_option",
    header: "PRODUCT_NAME",
  },
  {
    id: "item_option_id",
    accessorKey: "item_option_id",
    header: "PRODUCT_CODE",
  },
  {
    id: "total",
    accessorKey: "total",
    header: "VALUE_SOLD",
    // cell: ({ row }) => {
    //   const quantity = parseFloat(row.original.quantity as string);
    //   const price = parseFloat(row.original.price as string);
    //   const valueSold = quantity * price;
    //   return valueSold.toFixed(2); // Format to two decimal places
    // },
  },
  {
    id: "pitems",
    accessorKey: "pitems",
    header: "ITEM_QUANTITY",
    cell: ({ row }) => {
      const quantity = parseFloat(row.original.quantity as string); 
      if (!quantity) return "-";

      try {
        const itemQuantity = quantity;
        return itemQuantity || "-";
      } catch (error) {
        return "Invalid";
      }
    },
    footer: ({ table }) => {
      const totalQuantity = table.getFilteredRowModel().rows.reduce((total, row) => {
        const quantity = parseFloat(row.original.quantity as string) || 0;
        return total + quantity;
      }, 0);
      
      return `${totalQuantity.toFixed(2)}`;
    }
  },
  {
    id: "ptotal",
    accessorKey: "ptotal",
    header: "CART_TOTAL",
    // footer: ({ table }) => {
    //   const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
    //     const amount = parseFloat(row.original.ptotal as string) || 0;
    //     return sum + amount;
    //   }, 0);
      
    //   return `${total.toFixed(2)}`;
    // }
  },
  {
    id: "pdate",
    accessorKey: "pdate",
    header: "TRANSACTION_DATE",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => {
      return row.original.status === "1"
        ? "Completed"
        : row.original.status === "2"
          ? "Cancelled"
          : "Held";
    },
  },
];

export const cartColumns: ColumnDef<DirectSales>[] = [
  {
    id: "description",
    accessorKey: "item.description",
    header: "Item Name",
  },

  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "details.price",
    header: "Unit Price",
  },

  {
    id: "total",
    header: "Total",
    cell: (props) => {
      const row = props.row.original;
      const rowTotal =
        parseInt(row.quantity.toString()) *
        parseFloat(row.details.price.toString());
      const subTotal = rowTotal - parseInt(row.discount ?? "0.00");
      return React.createElement(
        "span",
        { className: "text-right" },
        subTotal.toFixed(2),
      );
    },
  },
];

export function calculateOfflineSubtotalAndDiscount(data: UnsynchedInvoice) {
  // Parse the pitems JSON string into an array of objects
  const pitems: TransactionInvItem[] = JSON.parse(data.pos_items);

  // Calculate the subtotal and total discount
  const result = pitems.reduce(
    (acc, item) => {
      const total = parseFloat(item.quantity) * parseFloat(item.price);
      const discount = parseFloat(item.discount);
      acc.subtotal += total;
      acc.totalDiscount += discount;
      return acc;
    },
    { subtotal: 0, totalDiscount: 0 },
  );

  return result;
}
export function calculateSubtotalAndDiscount(data: TransactionReportItem) {
  // Parse the pitems JSON string into an array of objects
  const pitems: TransactionInvItem[] = JSON.parse(data.pitems);

  // Calculate the subtotal and total discount
  const result = pitems.reduce(
    (acc, item) => {
      const total = parseFloat(item.quantity) * parseFloat(item.price);
      const discount = parseFloat(item.discount);
      acc.subtotal += total;
      acc.totalDiscount += discount;
      return acc;
    },
    { subtotal: 0, totalDiscount: 0 },
  );

  return result;
}
// export const exportToCSV = (
//   data: SalesReportItem[],
//   columns: ColumnDef<SalesReportItem>[],
// ) => {
//   const csvData = data.map((row) => {
//     const rowData: any = {};
//     columns.forEach((column) => {
//       rowData[column.id as keyof SalesReportItem] =
//         row[column.id as keyof SalesReportItem];
//     });
//     return rowData;
//   });
//   return csvData;
// };

export const exportToPDF = (
  data: GeneralSalesReportItem[],
  columns: ColumnDef<GeneralSalesReportItem>[],
) => {
  const doc = new jsPDF();
  const tableColumn = columns.map((column) => column.id!);
  const tableRows: any[] = [];

  data.forEach((row) => {
    const rowData = columns.map((column) => row[column.id as keyof unknown]);
    tableRows.push(rowData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
  });

  doc.save("gen-item-report.pdf");
};

export const searchParamsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const toDBDate = (originalDate: string) => {
  const date = new Date(originalDate);

  // Format the date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedDate;
};

export function transformArrayToCart(input: TransactionReportItem): Cart {
  // Parse the items (which are stored as a string)
  const parsedItems: TransactionInvItem[] = JSON.parse(input.pitems);

  // Convert each item in pitems to DirectSales type
  const directSalesItems: DirectSales[] = parsedItems.map(
    (item: TransactionInvItem) => ({
      __typename: "direct_sales",
      user: input.uname,
      bottles_issued: item.bottles_issued || "",
      bottles_returned: item.bottles_returned || "",
      max_quantity: parseFloat(item.quantityAval),
      discount: item.discount,
      item: {
        stock_id: item.item_option_id,
        description: item.item_option,
        rate: item.rate,
        kit: item.kit,
        units: "",
        mb_flag: "",
      },
      details: {
        price: parseFloat(item.price),
        total: item.total,
        tax: parseFloat(item.tax),
        quantity_available: parseFloat(item.quantityAval),
        tax_mode: 0,
      },
      quantity: parseFloat(item.quantity),
    }),
  );

  // Create the Cart object
  return {
    cart_id: input.unique_identifier,
    items: directSalesItems,
  };
}


export const SYSTEM_HOLD_REASONS = {
  END_SHIFT: ["System: End of shift - Incomplete transaction"],
  LOGOUT: ["System: User logout - Incomplete transaction"]
} satisfies Record<string, string[]>;