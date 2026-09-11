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
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { RotateCcw } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filCol: string;
  onRowClick: (rowData: TData) => void;
  searchKey?: string;
  onRefetch?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filCol,
  onRowClick,
  searchKey,
  onRefetch,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // console.log("data", data.reverse());
  const [rowClicked, setRowClicked] = useState<number | null>(null);

  const table = useReactTable({
    data: filCol === "description" ? data : data.reverse(),
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

  return (
    <>
      <div className="flex flex-col items-center justify-end space-y-3 py-4">
        {filCol !== "TransAmount" && (
          <Input
            placeholder={"Search...".concat(searchKey ? searchKey : "")}
            name="cart-search"
            onChange={(event) =>
              table.getColumn(filCol)?.setFilterValue(event.target.value)
            }
            value={
              (table.getColumn(filCol)?.getFilterValue() as string) ?? searchKey
            }
            className="max-w-md"
          />
        )}
        {filCol === "TransAmount" && (
          <div className="flex flex-row justify-between space-x-3">
            <Input
              placeholder={"Search...".concat(searchKey ? searchKey : filCol)}
              name="cart-search"
              onChange={(event) =>
                table.getColumn(filCol)?.setFilterValue(event.target.value)
              }
              value={
                (table.getColumn(filCol)?.getFilterValue() as string) ??
                searchKey
              }
              className="max-w-md"
            />
            <Input
              placeholder="Search by Name"
              name="cart-search"
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              // value={
              //   (table.getColumn("name")?.getFilterValue() as string) ?? "name"
              // }
              className="max-w-sm"
            />
            <Button
              onClick={onRefetch}
              className="flex-grow gap-2"
              variant={"default"}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
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
                  onClick={() => {
                    onRowClick(row.original);
                    setRowClicked(rowIndex);
                  }}
                  onKeyDown={(event) =>
                    handleKeyDown(event, rowIndex, row.original)
                  }
                  onFocus={() => setFocusedRowIndex(rowIndex)}
                  className={rowClicked === rowIndex ? "bg-blue-200  " : ""}
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
        </Table>
      </div>
    </>
  );
}
