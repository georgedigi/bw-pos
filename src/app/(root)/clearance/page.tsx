"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  PlusCircle,
  PlusIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import CollectionsDataTable from "~/components/data-table/collections-table";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { usePosTransactionsReport } from "~/hooks/use-reports";
import { useShiftCollections, useShifts } from "~/hooks/use-shifts";
import { submit_shift_collection } from "~/lib/actions/user.actions";
import {
  clearanceFormSchema,
  cn,
  CollectionsReportColumns,
  toDate,
} from "~/lib/utils";
import { useAuthStore } from "~/store/auth-store";
import { pdf } from "@react-pdf/renderer";
import ClearancePrintPDF from "~/components/pdfs/clearancePrint";

const Clearance = () => {
  const { site_company, account, site_url, receipt_info } =
    useAuthStore.getState();
  const roles = localStorage.getItem("roles");
  const router = useRouter();
  const getCurrentDate: any = () => new Date().toISOString().split("T")[0];
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get("searchTerm") ?? "",
  );
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const {
    data: shiftCollections,
    isLoading,
    error,
    refetch,
  } = useShiftCollections(
    site_url!,
    site_company!.company_prefix,
    params.from,
    params.to,
  );

  const { data: shifts, isLoading: shiftsLoading } = useShifts(
    site_url!,
    site_company!.company_prefix,
    toDate(new Date()),
    toDate(new Date()),
    account?.default_store,
  );

  const { posTransactionsReport, loading } = usePosTransactionsReport({
    from: params.from,
    to: params.to,
  });

  const [openPopover, setOpenPopover] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<TransTypeSummary[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [calculatedValues, setCalculatedValues] = useState<
    Record<string, number>
  >({});

  const handleAmountChange = (transType: string | undefined, value: string) => {
    if (transType) {
      setAmounts((prevAmounts) => ({
        ...prevAmounts,
        [transType]: value,
      }));
    }
  };

  const handleClearancePrint = async () => {
    console.log("printing");
    const pdfBlob = await pdf(
      <ClearancePrintPDF
        selectedShift={selectedShift}
        amounts={amounts}
        paymentSummary={paymentSummary}
        receipt_info={receipt_info!}
        account={account!}
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
    const cleanup = () => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);

      // Force reload or redirection after printing to ensure no page residue
      window.location.reload(); // or window.history.back(); if you want to return to the previous page
    };

    iframe.contentWindow!.onafterprint = cleanup;

    // Fallback to force cleanup in case onafterprint fails
    setTimeout(cleanup, 15000);
  };

  useEffect(() => {
    if (!selectedShift) return;
    const data = summarizeByTransType(posTransactionsReport);
    console.log("summarizeByTransType", data);
    setPaymentSummary(data);
  }, [selectedShift, posTransactionsReport]);

  useEffect(() => {
    if (roles) {
      if (!roles.includes("mBranchManager")) {
        router.push("/dashboard");
        return;
      } else {
        return;
      }
    } else {
      router.push("/dashboard");
      return;
    }
  }, [roles]);

  useEffect(() => {
    console.log("paymentSummary", paymentSummary);
    console.log("selectedShift", selectedShift);
    console.log("shiftCollections", shiftCollections);
    if (selectedShift && shiftCollections) {
      const newCalculatedValues = paymentSummary.reduce((acc, paymentType) => {
        const totalCollected = (shiftCollections as CollectionReportItem[])
          .filter(
            (item) =>
              item.pay_mode === paymentType.TransType &&
              item.shift_no === selectedShift?.id,
          )
          .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const recordedValue = paymentType.TotalAmount - totalCollected;

        return {
          ...acc,
          [paymentType.TransType ?? ""]: recordedValue,
        };
      }, {});

      setCalculatedValues(newCalculatedValues);
      console.log("newCalculatedValues", newCalculatedValues);
    }
  }, [selectedShift, shiftCollections, paymentSummary]);

  const summarizeByTransType = (
    data: TransactionReportItem[],
  ): TransTypeSummary[] => {
    const summary: Record<string, number> = {};
    console.log("summarizeByTransTypeData", data);
    console.log("selectedShift", selectedShift);
    if (!selectedShift) return [];
    data
      .filter((x) => x.shift_no === selectedShift.id)
      .forEach((transaction) => {
        const payments: Payment[] = JSON.parse(transaction.payments);
        payments.forEach((payment) => {
          console.log("payment-add", payment);
          const { Transtype, TransAmount } = payment;
          console.log("payment-typess", Transtype);
          const amount =
            typeof TransAmount === "string"
              ? parseFloat(TransAmount)
              : TransAmount;
          const type = Transtype ?? "unknown_payment";

          if (!summary[type]) {
            summary[type] = 0;
          }

          summary[type] += amount;
        });
      });
    console.log("summary", summary);
    return Object.entries(summary).map(([TransType, TotalAmount]) => ({
      TransType,
      TotalAmount,
    }));
  };

  const onSubmit = async () => {
    console.log("submitting");
    const dataToSubmit = paymentSummary.map((paymentType) => ({
      TransType: paymentType.TransType!,
      ActualValue: amounts[paymentType.TransType!]?.toString() || "0.00",
    }));
    console.log("Submitted", dataToSubmit);
    const res = await submit_shift_collection(
      site_url!,
      site_company!.company_prefix,
      account!.id,
      selectedShift!.id,
      dataToSubmit,
    );
    if (!res || res.status === "Failed") {
      toast.error("Something went wrong");
    } else {
      toast.success("Collections saved");
      await handleClearancePrint();
      await refetch();
      setDialogOpen(false);
      setSelectedShift(null);
      setAmounts({});
    }
  };

  const formSchema = clearanceFormSchema();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift_no: "",
      user_id: "",
      collections: [],
    },
  });

  console.log("payment summaries", paymentSummary);

  console.log("recordedValue", calculatedValues);
  if (isLoading || shiftsLoading) {
    return <p>Loading</p>;
  }

  if (error) {
    return <p>Error</p>;
  }

  if (shiftCollections.length === 0) {
    return (
      <DashboardLayout title="Shift Collections">
        <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
            <DateRangePicker
              triggerSize="sm"
              triggerClassName="ml-auto w-56 sm:w-60"
              align="end"
            />
            <div className=" ml-auto w-56 sm:w-60">
              <p className="text-right text-xs text-muted-foreground">
                from <strong>{params.from}</strong> to{" "}
                <strong>{params.to}</strong>
              </p>
            </div>
          </React.Suspense>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold md:text-2xl">
              Shift Collections
            </h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size={"sm"} variant={"default"}>
                  <PlusCircle className="h-6 w-6" />
                  Add new
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Payment Collection</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="shift_no"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Shift Number</FormLabel>
                            <Popover
                              open={openPopover}
                              onOpenChange={setOpenPopover}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    {selectedShift
                                      ? `${
                                          shifts.find(
                                            (x: Shift) =>
                                              x.id === selectedShift.id,
                                          )?.user_name
                                        } - ${new Date(selectedShift.start_date).toLocaleTimeString()}`
                                      : "Select Shift Number"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search" />
                                  <CommandList>
                                    <CommandEmpty>No results</CommandEmpty>
                                    <CommandGroup>
                                      {shifts.map((shift: Shift) => (
                                        <CommandItem
                                          key={shift.id}
                                          value={shift.id}
                                          onSelect={(value) => {
                                            setSelectedShift(
                                              (shifts as Shift[]).find(
                                                (shift) => shift.id === value,
                                              ) ?? null,
                                            );
                                            form.setValue("shift_no", value);
                                            setOpenPopover(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              shift.id ===
                                                (selectedShift
                                                  ? selectedShift.id
                                                  : field.value)
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          {`${shift.id} - ${shift.user_name} -  ${new Date(shift.start_date).toLocaleTimeString()} `}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                      {paymentSummary.map((paymentType) => (
                        <div
                          key={paymentType.TransType}
                          className="flex-col space-y-2 "
                        >
                          <Label htmlFor="name" className="text-right">
                            {paymentType.TransType}
                          </Label>
                          <Input
                            id="recorded_value"
                            defaultValue={paymentType.TotalAmount}
                            value={`KES ${paymentType.TotalAmount}`}
                            className="col-span-3"
                            disabled={true}
                          />
                          <Input
                            id={`actual_value_${paymentType.TransType}`}
                            defaultValue="0.00"
                            className="col-span-3"
                            value={
                              paymentType.TransType !== undefined
                                ? amounts[paymentType.TransType]
                                : ""
                            }
                            onChange={(e) =>
                              handleAmountChange(
                                paymentType.TransType,
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      ))}
                    </form>
                  </Form>
                </div>

                <DialogFooter>
                  <Button onClick={onSubmit} className="w-full">
                    Clear Cashier
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no collections for the selected date range
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start generating a report as soon as you collect from
                cashier. Adjust the date range to see collections from a
                specific date.
              </p>
              {/* Add a collection button */}
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="Cashier Clearance">
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
          <DateRangePicker
            triggerSize="sm"
            triggerClassName="ml-auto w-56 sm:w-60"
            align="end"
          />
          <div className=" ml-auto w-56 sm:w-60">
            <p className="text-right text-xs text-muted-foreground">
              from <strong>{params.from}</strong> to{" "}
              <strong>{params.to}</strong>
            </p>
          </div>
        </React.Suspense>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">
            Shift Collections
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size={"sm"} variant={"default"}>
                <PlusCircle className="h-6 w-6" />
                Add new
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Payment Collection</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="shift_no"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Shift Number</FormLabel>
                          <Popover
                            open={openPopover}
                            onOpenChange={setOpenPopover}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {selectedShift
                                    ? `${
                                        shifts.find(
                                          (x: Shift) =>
                                            x.id === selectedShift.id,
                                        )?.user_name
                                      } - ${new Date(selectedShift.start_date).toLocaleTimeString()}`
                                    : "Select Shift Number"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search" />
                                <CommandList>
                                  <CommandEmpty>No results</CommandEmpty>
                                  <CommandGroup>
                                    {shifts.map((shift: Shift) => (
                                      <CommandItem
                                        key={shift.id}
                                        value={shift.id}
                                        onSelect={(value) => {
                                          setSelectedShift(
                                            (shifts as Shift[]).find(
                                              (shift) => shift.id === value,
                                            ) ?? null,
                                          );
                                          form.setValue("shift_no", value);
                                          setOpenPopover(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            shift.id ===
                                              (selectedShift
                                                ? selectedShift.id
                                                : field.value)
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {`${shift.id} - ${shift.user_name} -  ${new Date(shift.start_date).toLocaleTimeString()} `}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                    {paymentSummary.length === 0 && selectedShift && (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-sm text-muted-foreground">
                          No payments were made during this shift
                        </p>

                        {/* Add a collection button */}
                      </div>
                    )}
                    {selectedShift &&
                      paymentSummary.map((paymentType) => {
                        const recordedValue =
                          calculatedValues[paymentType.TransType ?? ""] || 0;

                        return (
                          <div
                            key={paymentType.TransType}
                            className="flex-col space-y-2 "
                          >
                            <Label htmlFor="name" className="text-right">
                              {paymentType.TransType}
                            </Label>
                            <Input
                              id="recorded_value"
                              defaultValue={recordedValue}
                              value={`KES ${recordedValue}`}
                              className="col-span-3"
                              disabled={true}
                            />
                            <span className="text-right text-xs text-green-800">
                              previously collected{" "}
                              {(shiftCollections as CollectionReportItem[])
                                .filter(
                                  (collection) =>
                                    collection.pay_mode ===
                                      paymentType.TransType &&
                                    collection.shift_no === selectedShift?.id,
                                )
                                .reduce(
                                  (sum, item) => sum + parseFloat(item.amount),
                                  0,
                                )}
                            </span>
                            <Input
                              id={`actual_value_${paymentType.TransType}`}
                              defaultValue="0.00"
                              className="col-span-3"
                              value={
                                paymentType.TransType !== undefined
                                  ? amounts[paymentType.TransType]
                                  : ""
                              }
                              disabled={recordedValue === 0}
                              onChange={(e) =>
                                handleAmountChange(
                                  paymentType.TransType,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        );
                      })}
                  </form>
                </Form>
              </div>

              <DialogFooter>
                <Button
                  onClick={onSubmit}
                  disabled={
                    (paymentSummary.length === 0 && selectedShift !== null) ||
                    !selectedShift
                  }
                  className="w-full"
                >
                  Clear Cashier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col gap-4">
          <CollectionsDataTable
            from={params.from}
            to={params.to}
            columns={CollectionsReportColumns}
            data={shiftCollections}
            onRowClick={(rowData) => console.log(rowData)}
          />
        </div>
      </main>
    </DashboardLayout>
  );
};

export default Clearance;
