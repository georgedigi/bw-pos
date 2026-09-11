"use client";
import { useState, useEffect, useRef, useMemo } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import CsvDownloader from "react-csv-downloader";
import { Button } from "../ui/button";
import { DownloadIcon } from "lucide-react";
import ReportDocument from "../pdfs/itemized";
import { pdf } from "@react-pdf/renderer";
import { useAuthStore } from "~/store/auth-store";
import { toast } from "sonner";
// import { Checkbox } from "~/components/ui/checkbox";
// import {
//   Popover,
//   PopoverTrigger,
//   PopoverContent,
// } from "~/components/ui/popover";
// import { PopoverPortal } from "@radix-ui/react-popover";

// Define the structure of the sales report item

interface DataTableProps<TData> {
  from: string | undefined;
  to: string | undefined;
  columns: ColumnDef<TData>[];
  data: TData[];
  onRowClick: (rowData: TData) => void;
}

export function CollectionsDataTable<TData extends CollectionReportItem>({
  from,
  to,
  columns,
  data,
  onRowClick,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const { receipt_info } = useAuthStore();
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      selectedCategory ? item.user_id === selectedCategory : true,
    );
  }, [data, selectedCategory]);

  const table = useReactTable({
    data: filteredData,
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
  const totalSum = filteredData.reduce((sum, item) => {
    return sum + parseFloat(item.amount);
  }, 0);
  const handlePrint = async (
    data: CollectionReportItem[],
    columns: ColumnDef<CollectionReportItem>[],
  ) => {
    try {
      console.log("handlePrint", data);

      const pdfBlob = await pdf(
        <ReportDocument
          data={data}
          columns={columns}
          receipt_info={receipt_info!}
          from={from ?? getCurrentDate()}
          to={to ?? getCurrentDate()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.zIndex = "1000";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.focus();
        iframe.contentWindow!.print();
        iframe.contentWindow!.onafterprint = () => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url); // Revoke the URL to free up resources
        };
      };
    } catch (error) {
      console.error("Failed to print document:", error);
      toast.error("Failed to print document");
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

  const csvColumns = columns.map((column) => ({
    id: column.id!,
    displayName: column.header as string,
  }));

  const transformDataForCSV = (data: CollectionReportItem[]) => {
    return data.map((item) => ({
      collection_no: item.id,
      user_id: item.user_id,
      trans_time: item.trans_time,
      shift_no: item.shift_no,
      pay_mode: item.pay_mode,
      amount: item.amount,
      trans_date: item.trans_date,
    }));
  };

  const transformedData = transformDataForCSV(filteredData);

  return (
    <div>
      <div className="flex items-center space-x-4 py-4">
        {/* <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            {Array.from(new Set(data.map((item) => item.category_name))).map(
              (category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox id={category} />
                  <label
                    htmlFor={category}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category}
                  </label>
                </div>
                // <SelectItem key={category} value={category}>
                //   {category}
                // </SelectItem>
              ),
            )}
          </PopoverContent>
        </Popover> */}
        <Select onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select User" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(new Set(data.map((item) => item.user_id))).map(
              (category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant={"outline"} size={"sm"}>
              <DownloadIcon className="mr-2 size-4" aria-hidden="true" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() =>
                handlePrint(
                  filteredData,
                  columns as ColumnDef<CollectionReportItem>[],
                )
              }
              // onSelect={() =>
              //   exportToPDF(
              //     filteredData,
              //     columns as ColumnDef<GeneralSalesReportItem>[],
              //   )
              // }
            >
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CsvDownloader
                filename={`collections_${new Date().toISOString()}`}
                columns={csvColumns}
                datas={transformedData}
              >
                Export to CSV
              </CsvDownloader>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            {filteredData.length ? (
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
                  className={focusedRowIndex === rowIndex ? "bg-gray-100" : ""}
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
            <TableRow>
              <TableCell colSpan={columns.length - 1} className="text-right">
                Total:
              </TableCell>
              <TableCell className="text-right">
                {totalSum.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

export default CollectionsDataTable;
