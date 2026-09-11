"use client";
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import { TransactionsDataTable } from "~/components/data-table/sales-report";
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton";
import { Shell } from "~/components/shell";
import { useItemizedSalesReport } from "~/hooks/use-reports";
import { salesReportColumns } from "~/lib/utils";
import { useAuthStore } from "~/store/auth-store";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const Itemized = () => {
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const searchParams = useSearchParams();
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });

  const { site_company } = useAuthStore();
  const { salesReport, loading, error } = useItemizedSalesReport(params);
  useEffect(() => {
    const newParams = {
      from: searchParams.get("from") ?? getCurrentDate(),
      to: searchParams.get("to") ?? getCurrentDate(),
    };
    setParams(newParams);
  }, [searchParams]);
  if (loading)
    return (
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div
          role="status"
          className="max-w-md animate-pulse space-y-4 divide-y divide-gray-200 rounded border border-gray-200 p-4 shadow dark:divide-gray-700 dark:border-gray-700 md:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <span className="sr-only">Loading...</span>
        </div>
      </main>
    );
  return (
    <DashboardLayout title={site_company?.branch ?? ""}>
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">
            {" "}
            Itemized Sales Reports
          </h1>
        </div>
        <DateRangePicker
          triggerSize="sm"
          triggerClassName="ml-auto w-56 sm:w-60"
        />
        {salesReport.length === 0 && !loading && !error ? (
          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no sales reports today
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start generating a report as soon as you make a sale.
              </p>
            </div>
          </div>
        ) : (
          <Shell className="gap-2">
            <React.Suspense
              fallback={
                <DataTableSkeleton
                  columnCount={5}
                  searchableColumnCount={1}
                  filterableColumnCount={2}
                  cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem"]}
                  shrinkZero
                />
              }
            >
              {" "}
              <div className="flex flex-col gap-4">
                <TransactionsDataTable
                  from={params.from}
                  to={params.to}
                  columns={salesReportColumns}
                  data={salesReport}
                  onRowClick={(rowData) => console.log(rowData)}
                />
              </div>
            </React.Suspense>
          </Shell>
        )}
      </main>
    </DashboardLayout>
  );
};

export default Itemized;
