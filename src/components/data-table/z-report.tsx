"use client";

import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type TransTypeSummary = {
  TransType: string | undefined;
  TotalAmount: number;
};

type TableProps = {
  data: TransTypeSummary[];
};

const ZReportTabled = ({ data }: TableProps) => {
  const table = useReactTable({
    data,
    columns: [
      {
        accessorKey: "TransType",
        header: "Payment Type",
      },
      {
        accessorKey: "TotalAmount",
        header: "Total Amount",
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment Type</TableHead>
            <TableHead>Total Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.getValue("TransType")}</TableCell>
              <TableCell>{row.getValue("TotalAmount")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total:</TableCell>
            <TableCell>
              {table.getRowModel().rows.reduce((acc, row) => {
                return acc + Number(row.getValue("TotalAmount"));
              }, 0)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default ZReportTabled;
