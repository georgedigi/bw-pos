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
import { useState, useEffect, useRef, useMemo } from "react";
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
import { toast } from "sonner";
import { useAuthStore } from "~/store/auth-store";

// Define the structure of the sales report item
interface SalesReportItem {
  stock_id: string;
  description: string;
  unit_price: string;
  quantity: string;
  category_name: string;
  parent_item: string;
}

interface DataTableProps<TData> {
  from: string | undefined;
  to: string | undefined;
  columns: ColumnDef<TData>[];
  data: TData[];
  onRowClick: (rowData: TData) => void;
}

export function TransactionsDataTable<TData extends SalesReportItem>({
  from,
  to,
  columns,
  data,
  onRowClick,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedParentItem, setSelectedParentItem] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedParentItems, setSelectedParentItems] = useState<string[]>([]);
  const { receipt_info } = useAuthStore();
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        (selectedCategory ? item.category_name === selectedCategory : true) &&
        (selectedParentItem ? item.parent_item === selectedParentItem : true),
    );
  }, [data, selectedCategory, selectedParentItem]);

  const filtdData = useMemo(() => {
    return data.filter(
      (item) =>
        (selectedCategories.length
          ? selectedCategories.includes(item.category_name)
          : true) &&
        (selectedParentItems.length
          ? selectedParentItems.includes(item.parent_item)
          : true),
    );
  }, [data, selectedCategories, selectedParentItems]);

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
  const getCurrentDate = () => new Date().toISOString().split("T")[0];

  const handlePrint = async (
    data: SalesReportItem[],
    columns: ColumnDef<SalesReportItem>[],
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

  const totalSum = filteredData.reduce((sum, item) => {
    return sum + parseFloat(item.unit_price) * parseInt(item.quantity);
  }, 0);

  const csvColumns = columns.map((column) => ({
    id: column.id!,
    displayName: column.header as string,
  }));

  const transformDataForCSV = (data: SalesReportItem[]) => {
    return data.map((item) => ({
      stock_id: item.stock_id,
      description: item.description,
      unit_price: item.unit_price,
      quantity: item.quantity,
      category_name: item.category_name,
      parent_item: item.parent_item,
    }));
  };

  const transformedData = transformDataForCSV(filteredData);

  return (
    <>
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
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(new Set(data.map((item) => item.category_name))).map(
              (category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select onValueChange={setSelectedParentItem}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Item Type" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(new Set(data.map((item) => item.parent_item))).map(
              (parentItem) => (
                <SelectItem key={parentItem} value={parentItem}>
                  {parentItem}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
                  columns as ColumnDef<SalesReportItem>[],
                )
              }
            >
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CsvDownloader
                filename="table"
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
    </>
  );
}

export default TransactionsDataTable;
