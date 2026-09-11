import { type ColumnDef } from "@tanstack/react-table";
import React from "react";
import DataTableColumnHeader from "~/components/data-table-column-header";

export const inventoryColumns: ColumnDef<StockItem>[] = [
  {
    accessorKey: "stock_id",
    header: "Item Code",
  },
  {
    accessorKey: "item",
    header: "Item Name",
    footer: "Total",
  },
  {
    accessorKey: "balance",
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-left"
        column={column}
        title="Balance"
      />
    ),
    cell: (props) => {
      const row = props.row.original;
      const rowTotal = parseInt(row.balance);
      return React.createElement(
        "span",
        { className: "text-right" },
        rowTotal.toFixed(2),
      );
    },
    footer: (props) => {
      const total = props.table.getCoreRowModel().rows.reduce((sum, row) => {
        const rowData = row.original;
        return sum + parseInt(rowData.balance);
      }, 0);
      return total.toFixed(2);
    },
  },
  {
    id: "price",
    header: "Tagged price",
    accessorFn: (row) => row.selling_price || row.price,
    cell: (props) => {
      const row = props.row.original;
      const price = parseInt(row.selling_price || row.price || "0");
      return React.createElement(
        "span",
        { className: "text-right" },
        price.toLocaleString()
      );
    }
  },
  {
    id: "actions",
  },
];