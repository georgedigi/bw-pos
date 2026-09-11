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
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DownloadIcon } from "lucide-react";
import CsvDownloader from "react-csv-downloader";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
}

export function TransactionsDataTable<TData extends TransactionReportItem>({
  columns,
  data,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [roles, setRoles] = useState<string | null>(null);

  useEffect(() => {
    setRoles(localStorage.getItem('roles'));
  }, []);

  function transformData(data: TransactionReportItem[]) {
    return data.flatMap((transaction) => {
      const pitems = JSON.parse(transaction.pitems);
      return pitems.map((item: any) => ({
        ...item,
        transactionId: transaction.id,
        uid: transaction.uid,
        uname: transaction.uname,
        customerid: transaction.customerid,
        customername: transaction.customername,
        branch_name: transaction.branch_name,
        ptotal: transaction.ptotal,
        pdate: transaction.pdate,
        status: transaction.status,
      }));
    });
  }
  // console.log("columns", columns);

  const csvColumns = columns.map((column) => ({
    id: column.id!,
    displayName: column.header as string,
  }));

  const transformedData = transformData(data);
  // const transformDataForCSV = (data: TransactionReportItem[]) => {
  //   return data.map((item) => ({
  //     stock_id: item.stock_id,
  //     description: item.description,
  //     unit_price: item.unit_price,
  //     quantity: item.quantity,
  //     category_name: item.category_name,
  //     parent_item: item.parent_item,
  //   }));
  // };

  const table = useReactTable({
    data: transformedData,
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

  return (
    <>
      {roles && roles.includes("mBranchManager") && (
        <div className="flex flex-row justify-end">
          <CsvDownloader
            filename="transactions"
            columns={csvColumns}
            datas={transformedData}
          >
            <Button variant={"outline"} size={"sm"}>
              <DownloadIcon className="mr-2 size-4" aria-hidden="true" />
              Export
            </Button>
          </CsvDownloader>
        </div>
      )}
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
            {transformedData.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  tabIndex={0}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center">
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
              <TableRow key={footerGroup.id} className="border-t">
                <TableCell className="font-medium">Total</TableCell>
                {footerGroup.headers.map((header, index) => {
                  // Skip the first cell since we already have the "Total" cell
                  if (index === 0) return null;

                  return (
                    <TableCell
                      key={header.id}
                      className="py-3 text-right font-medium"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.footer,
                          header.getContext()
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
