"use client";
import { Search, Table2Icon, Wallet2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import { TransactionsDataTable } from "~/components/data-table/transaction-report";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  useHeldTransactionsReport,
  usePosTransactionsReport,
} from "~/hooks/use-reports";
import { posTransactionColumns } from "~/lib/utils";
const TransactionCard = dynamic(
  () => import("~/components/common/transaction-card"),
  {
    ssr: false,
  },
);

export interface IndexPageProps {
  searchParams: SearchParams;
}

const TransactionsPage = () => {
  const getCurrentDate: any = () => new Date().toISOString().split("T")[0];
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get("searchTerm") ?? "",
  );
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });
  const [tableView, setTableView] = useState<boolean>(false);
  const { posTransactionsReport, loading, refetch } =
    usePosTransactionsReport(params);
  const {
    heldTransactionsReport,
    loading: loadingHeld,
    refetch: refetchHeld,
  } = useHeldTransactionsReport(params);

  const all = useMemo(
    () =>
      posTransactionsReport.concat(
        heldTransactionsReport.filter((x) => x.status !== "1"),
      ),
    [posTransactionsReport, heldTransactionsReport],
  );

  // Apply the filter based on the search term
  const filteredTransactions = useMemo(() => {
    return all.filter(
      (transaction) =>
        transaction.ptotal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.unique_identifier
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [all, searchTerm]);

  // console.log('All POS transactions Report', filteredTransactions);

  console.log("searchParams", searchParams.get("searchTerm"));
  useEffect(() => {
    const newParams = {
      from: searchParams.get("from") ?? getCurrentDate(),
      to: searchParams.get("to") ?? getCurrentDate(),
    };
    setParams(newParams);
  }, [searchParams]);
  if (loading || loadingHeld) {
    return (
      <DashboardLayout title="Transactions">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (filteredTransactions.length === 0 && !loading && !loadingHeld) {
    return (
      <DashboardLayout title="Transactions">
        <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
            <DateRangePicker
              triggerSize="sm"
              triggerClassName="ml-auto w-56 sm:w-60"
              align="end"
            />
          </React.Suspense>
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl"> Transactions</h1>
          </div>

          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no transactions for the selected date range
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start generating a report as soon as you make a sale.
                Adjust the date range to see transactions from a specific date.
              </p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Transactions">
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-5 lg:p-6">
        <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
          <DateRangePicker
            triggerSize="sm"
            triggerClassName="ml-auto w-56 sm:w-60"
            align="end"
          />
        </React.Suspense>
        <Tabs defaultValue="completed">
          <div className="flex flex-row items-center justify-between space-x-1">
            <TabsList>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="held">Held</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
            <Button
              variant="default"
              size={"sm"}
              onClick={() => setTableView(!tableView)}
            >
              {!tableView && <Table2Icon className=" mx-1 h-4 w-4 " />}
              {!tableView && "Table View"}
              {tableView && <Wallet2Icon className=" mx-1 h-4 w-4 " />}
              {tableView && "Card View"}
              {/* Table View */}
            </Button>
            <div className="relative ml-auto flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
          </div>

          <TabsContent value="completed">
            {!tableView && (
              <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {filteredTransactions
                  .filter((x) => x.status === "1")
                  .map((x) => (
                    <TransactionCard
                      key={x.id}
                      data={x}
                      status="Completed"
                      onRefresh={refetch}
                    />
                  ))}
              </div>
            )}
            {tableView && (
              <div className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <TransactionsDataTable
                  data={all.filter((x) => x.status === "1")}
                  columns={posTransactionColumns}
                />
              </div>
            )}
          </TabsContent>
          <TabsContent value="held">
            {!tableView && (
              <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {filteredTransactions
                  .filter((x) => x.status === "0")
                  .map((x) => (
                    <TransactionCard
                      key={x.id}
                      data={x}
                      status="Held"
                      onRefresh={refetchHeld}
                    />
                  ))}
              </div>
            )}
            {tableView && (
              <div className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <TransactionsDataTable
                  data={all.filter((x) => x.status === "0")}
                  columns={posTransactionColumns}
                />
              </div>
            )}
          </TabsContent>
          <TabsContent value="closed">
            {!tableView && (
              <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {filteredTransactions
                  .filter((x) => x.status === "2")
                  .map((x) => (
                    <TransactionCard
                      key={x.id}
                      data={x}
                      status="Held"
                      onRefresh={refetchHeld}
                    />
                  ))}
              </div>
            )}
            {tableView && (
              <div className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <TransactionsDataTable
                  data={all.filter((x) => x.status === "2")}
                  columns={posTransactionColumns}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
};

export default TransactionsPage;
