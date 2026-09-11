"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { useState, useEffect, useRef } from "react";

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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filCol: string;
  onRowClick: (rowData: TData) => void;
  searchKey?: string;
  invalidItems?: CartItem[];
}

export function CartTable<TData, TValue>({
  columns,
  data,
  filCol,
  onRowClick,
  searchKey,
  invalidItems = [],
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection: rowSelection,
      sorting,
    },

    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleKeyDown = (
    event: React.KeyboardEvent,
    rowIndex: number,
    rowData: TData,
  ) => {
    if (event.key === "Tab") {
      setFocusedRowIndex((prevIndex) =>
        prevIndex === null
          ? 0
          : Math.min(prevIndex + 1, table.getRowModel().rows.length - 1),
      );
    } else if (event.key === "Enter") {
      onRowClick(rowData);
    }
  };

  useEffect(() => {
    if (focusedRowIndex !== null && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("tr");
      if (rows[focusedRowIndex]) {
        (rows[focusedRowIndex] as HTMLElement).focus();
      }
    }
  }, [focusedRowIndex]);
  useEffect(() => {
    if (searchKey && searchKey.length > 0) {
      table.getColumn(filCol)?.setFilterValue(searchKey);
    }
  }, [searchKey]);

  const isRowInvalid = (row: TData) => {
    return invalidItems?.some(
      (invalidItem) =>
        (row as unknown as CartItem).item.stock_id === invalidItem.item.stock_id
    );
  };

  return (
    <>
      <div className="rounded-md border" ref={tableRef}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  tabIndex={0}
                  onClick={() => onRowClick(row.original)}
                  onKeyDown={(event) =>
                    handleKeyDown(event, rowIndex, row.original)
                  }
                  onFocus={() => setFocusedRowIndex(rowIndex)}
                  className={`
                    ${focusedRowIndex === rowIndex ? "bg-gray-100" : ""}
                    ${isRowInvalid(row.original) ? "bg-red-100" : ""} // Highlight invalid rows
                  `}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            {table.getFooterGroups().map((footerGroup) => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.length > 0 &&
                  footerGroup.headers.map((footer) => {
                    return (
                      <TableCell key={footer.id}>
                        {footer.isPlaceholder
                          ? null
                          : flexRender(
                              footer.column.columnDef.footer,
                              footer.getContext(),
                            )}
                      </TableCell>
                    );
                  })}
              </TableRow>
            ))}
          </TableFooter>
          {/* <TableFooter>
            {table.getFooterGroups().map((footerGroup) => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map((footer) => {
                  return (
                    <TableCell key={footer.id}>
                      {footer.isPlaceholder
                        ? null
                        : flexRender(
                            footer.column.columnDef.footer,
                            footer.getContext(),
                          )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableFooter> */}
        </Table>
      </div>
    </>
  );
}
