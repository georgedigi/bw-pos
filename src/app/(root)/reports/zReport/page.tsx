"use client";
import { PrinterIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import ZReportTable from "~/components/z-report-table";
import {
  useItemizedSalesReport,
  usePosTransactionsReport,
} from "~/hooks/use-reports";

const zReport = () => {
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const searchParams = useSearchParams();
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });

  const { posTransactionsReport, loading } = usePosTransactionsReport({
    from: params.from,
    to: params.to,
  });
  // const {
  //   salesReport,
  //   loading: itemizedLoading,
  //   error,
  // } = useItemizedSalesReport({
  //   from: params.from,
  //   to: params.to,
  // });
  const {
    salesReport,
    loading: itemizedLoading,
    error,
  } = useItemizedSalesReport(params);

  useEffect(() => {
    const newParams = {
      from: searchParams.get("from") ?? getCurrentDate(),
      to: searchParams.get("to") ?? getCurrentDate(),
    };
    setParams(newParams);
  }, [searchParams]);

  if (loading || itemizedLoading)
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
    <DashboardLayout title={"ZReport"}>
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
          <DateRangePicker
            triggerSize="sm"
            triggerClassName="ml-auto w-56 sm:w-60"
            align="end"
          />
        </React.Suspense>
        <div className="flex h-full flex-1 items-center justify-center ">
          <div className="h-full w-full flex-grow  flex-col items-center justify-center gap-1 ">
            <ZReportTable data={posTransactionsReport} sales={salesReport} />
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default zReport;
