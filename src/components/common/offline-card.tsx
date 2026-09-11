"use client";
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  CheckCheckIcon,
  InfoIcon,
  PrinterIcon,
  RefreshCcwIcon,
  Timer,
} from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { cn, toDate } from "~/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { sync_invoice } from "~/lib/actions/pay.actions";
import { useAuthStore } from "~/store/auth-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateInvoice } from "~/utils/indexeddb";

const UnsynchedCard = ({
  data,
  refetch,
}: {
  data: UnsynchedInvoice;
  refetch: () => void;
}) => {
  const router = useRouter();
  const items: TransactionInvItem[] =
    data.pos_items.length > 0 ? JSON.parse(data.pos_items) : [];
  const { site_url, site_company } = useAuthStore();

  const handleSyncInvoice = async () => {
    console.log("issueClearCart");
    const response = await sync_invoice(
      site_url!,
      site_company!.company_prefix,
      data,
    );

    if (!response) {
      toast.error("Failed to sync invoice");
      return;
    } else if (response.status === "Failed") {
      toast.error(response.message as string);

      data.synced = true;
      data.synced_at = new Date().toISOString();
      data.offline = false;
      await updateInvoice(data.uid, data);
      return;
    } else {
      toast.success("Invoice synced successfully");
      refetch();
    }
    refetch();
  };
  const handlePrintInvoice = async () => {
    const fdate = new Date(data.inv_date);
    // router.push(`/transactions/?&searchTerm=${data.uid}`);
    router.push(`/transactions/?from=${toDate(fdate)}&searchTerm=${data.uid}`);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="  flex-col space-y-2">
          <div className="flex items-center gap-4">
            {/* <Avatar className="hidden h-9 w-9 p-2 sm:flex">
              <User2Icon className="h-9 w-9 text-zinc-700" />
            </Avatar> */}
            <div className="grid w-full  gap-1">
              <div className="flex flex-row items-center justify-between gap-4">
                <p className="text-xs font-medium leading-none">
                  {data.customer.br_name}
                </p>
                <span
                  className={cn(
                    "space-data-2 flex flex-row items-center justify-evenly rounded-sm  p-1",
                    data.synced === true ? "bg-green-200" : "bg-red-200",
                  )}
                >
                  {data.synced === true && (
                    <CheckCheckIcon className="h-3 w-3 text-emerald-950" />
                  )}
                  {data.synced === false && (
                    <Timer className="h-3 w-3 text-orange-950" />
                  )}

                  {data.synced === false && (
                    <p className="text-xs text-red-950">Pending</p>
                  )}
                  {data.synced === true && (
                    <p className="text-xs text-emerald-950">Synced</p>
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">{data.uid}</p>
              </div>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          <div className="flex flex-row items-center justify-between gap-4">
            <p>{new Date(data.inv_date).toLocaleDateString()}</p>
            <p>{new Date(data.inv_date).toLocaleTimeString()}</p>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-56">
          <Table className="h-full">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 &&
                items.map((x) => (
                  <TableRow key={x.item_option_id}>
                    <TableCell className="w-[200px] text-xs">
                      {x.item_option}
                    </TableCell>
                    <TableCell className="w-[70px] text-xs">
                      {x.quantity}
                    </TableCell>
                    <TableCell className="text-xs">KES {x.price}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="mt-4 flex flex-row items-center justify-between gap-4">
          <p className="text-md font-semibold">Total</p>
          <p className="text-md font-semibold   ">KES {data.total || 0}</p>
        </div>
      </CardContent>
      {data.synced === true && (
        <CardFooter className="flex flex-row justify-between space-x-3 border-t p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-grow gap-2">
                <InfoIcon className="h-3.5 w-3.5" />
                Info
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Payments</CardTitle>
                  <CardDescription>
                    <div className="flex flex-row items-center justify-between gap-4">
                      <p>
                        The following are the corresponding payments made for
                        the invoice.
                      </p>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-56">
                    <Table className="h-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      {/* <TableBody>
                          {payments &&
                            payments.length > 0 &&
                            payments.map((x) => (
                              <TableRow key={x.name}>
                                <TableCell className="w-[200px] text-xs">
                                  {x.name}
                                </TableCell>
                                <TableCell className="w-[70px] text-xs">
                                  {x.TransAmount}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {x.Transtype}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody> */}
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="default"
            className="flex-grow gap-2"
            onClick={handlePrintInvoice}
          >
            <PrinterIcon className="h-3.5 w-3.5" />
            View
          </Button>
        </CardFooter>
      )}
      {data.synced === false && (
        <CardFooter className="flex flex-row justify-between space-x-3 border-t p-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrintInvoice}
            className="flex-grow gap-2"
          >
            <PrinterIcon className="h-3.5 w-3.5" />
            Re-Print
          </Button>
          <Button
            onClick={handleSyncInvoice}
            size="sm"
            variant="default"
            className="flex-grow gap-2"
          >
            <RefreshCcwIcon className="h-3.5 w-3.5" />
            Sync
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default UnsynchedCard;
