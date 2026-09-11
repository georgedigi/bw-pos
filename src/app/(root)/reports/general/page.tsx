"use client";
import React, { useEffect, useState } from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton";
import { Shell } from "~/components/shell";
import {
  useGeneralSalesReport,
  useItemizedSalesReport,
} from "~/hooks/use-reports";
import { generalSalesReportColumns } from "~/lib/utils";
import { useAuthStore } from "~/store/auth-store";
import GeneralSalesDataTable from "~/components/data-table/general-report";
import { useRouter, useSearchParams } from "next/navigation";

const Itemized = () => {
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const roles = localStorage.getItem("roles");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });
  const { site_company } = useAuthStore();
  const { generalSalesReport, loading, error } = useGeneralSalesReport(params);
  const { salesReport } = useItemizedSalesReport(params);
  useEffect(() => {
    const newParams = {
      from: searchParams.get("from") ?? getCurrentDate(),
      to: searchParams.get("to") ?? getCurrentDate(),
    };
    setParams(newParams);
  }, [searchParams]);
  useEffect(() => {
    if (!roles?.includes("mBranchManager")) {
      router.push("/dashboard");
    }
  }, [roles]);

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

  console.log("generalSalesReport", generalSalesReport);
  return (
    <DashboardLayout title={site_company?.branch ?? ""}>
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">
            General Sales Reports
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
                You have no sales for this period
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start generating a report as soon as you make a sale.
              </p>
            </div>
          </div>
        ) : (
          <Shell className="gap-2">
            {/* <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
              <DateRangePicker
                triggerSize="sm"
                triggerClassName="ml-auto w-56 sm:w-60"
              />
            </React.Suspense> */}
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
              <div className="flex flex-col gap-4">
                <GeneralSalesDataTable
                  from={params.from}
                  to={params.to}
                  columns={generalSalesReportColumns}
                  data={generalSalesReport}
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
