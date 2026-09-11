"use client";
import { CreditCard, DollarSign, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { DateRangePicker } from "~/components/common/date-range-picker";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cleanupDiscountsForShift, initializeDiscountsForShift } from "~/hawk-tuah/services/shift-discount-integration";
import {
  useDailySalesTargetReport,
  useHeldTransactionsReport,
  useItemizedSalesReport,
  usePosTransactionsReport,
} from "~/hooks/use-reports";
import {
  fetch_user_roles,
  submit_end_shift,
  submit_start_shift,
} from "~/lib/actions/user.actions";
import { useAuthStore } from "~/store/auth-store";

interface DateParams {
  from?: string;
  to?: string;
}
const DashBoard = () => {
  const { site_company, account, site_url } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const [params, setParams] = useState<DateParams>({
    from: searchParams.get("from") ?? getCurrentDate(),
    to: searchParams.get("to") ?? getCurrentDate(),
  });
  const shift = localStorage.getItem("start_shift");
  const sft: CheckInResponse = JSON.parse(shift || "{}");
  const [shift_started, set_shift_started] = useState<boolean>(
    sft.message === "Success" && sft.user_id === account?.id,
  );
  const { posTransactionsReport } = usePosTransactionsReport(params);
  const { heldTransactionsReport } = useHeldTransactionsReport(params);
  const { salesReport, loading: loadingItemizedSalesReport } =
    useItemizedSalesReport(params);

  const { dailyTargets, loading } = useDailySalesTargetReport();
  const achievement = () => {
    if (dailyTargets?.status === "SUCCESS") {
      const acv =
        parseFloat(dailyTargets.data.sales_to_date) /
        parseFloat(dailyTargets.data.target);
      const res = Math.round(acv * 100);
      return res;
    } else {
      return 0.0 as number;
    }
  };
  useEffect(() => {
    const newParams = {
      from: searchParams.get("from") ?? getCurrentDate(),
      to: searchParams.get("to") ?? getCurrentDate(),
    };
    setParams(newParams);
  }, [searchParams]);

  const roles = localStorage.getItem("roles");
  // console.log("roles", roles);

  useEffect(() => {
    if (roles === null) {
      console.log("rolesssss");

      handleFetchRoles().catch((err) => {
        console.log("error", err);
      });
    }
  }, [roles]);

  const handleFetchRoles = async () => {
    const response = await fetch_user_roles(
      site_url!,
      site_company!.company_prefix,
      account!.role_id,
      account!.id,
    );
    if (response === null) {
      toast.error("Failed to fetch roles");
    } else {
      localStorage.setItem("roles", JSON.stringify(response));
    }
  };

  const handleCheckin = async () => {
    if (shift_started) {
      router.push("/");
    } else {
      console.log("checkin");
      const response = await submit_start_shift(
        site_url!,
        site_company!.company_prefix,
        account!.id,
      );

      if (response?.id) {
        set_shift_started(true);
        toast.success("Shift started");

        // ADD: Initialize discount service after successful shift start
        try {
          const discountInitialized = await initializeDiscountsForShift();
          if (discountInitialized) {
            console.log('✅ Discount system ready');
          } else {
            console.warn('⚠️ Discount system failed to initialize (POS will work without discounts)');
          }
        } catch (error) {
          console.error('❌ Discount initialization error:', error);
          // Don't block shift start if discount service fails
        }

        router.push("/");
      } else {
        try {
          console.log(response)
          toast.error("Failed to start shift");
          set_shift_started(false);
        } catch (err) {
          console.log("Error: ", err)
        }
      }
    }
  };

  const handleBMCheckin = async () => {
    if (shift_started) {
      await handleCheckOut();
    } else {
      console.log("checkin");
      const response = await submit_start_shift(
        site_url!,
        site_company!.company_prefix,
        account!.id,
      );
      if (response?.id) {
        toast.success("Shift started");
        set_shift_started(true);
        router.refresh();
        router.push("/dashboard");
      } else {
        toast.error("Failed to start shift");
        set_shift_started(false);
      }
    }
  };

  const handleCheckOut = async () => {
    console.log("checkout");
    const shift = localStorage.getItem("start_shift");
    const s: CheckInResponse = JSON.parse(shift!);

    const response = await submit_end_shift(
      site_url!,
      site_company!.company_prefix,
      account!.id,
      s.id,
    );

    console.log(" checkout response", response);

    if (response) {
      // ADD: Cleanup discount service before ending shift
      try {
        cleanupDiscountsForShift();
        console.log('✅ Discount service cleanup completed');
      } catch (error) {
        console.error('❌ Discount cleanup error:', error);
        // Don't block shift end if cleanup fails
      }

      localStorage.removeItem("start_shift");
      set_shift_started(false);
      toast.success("Shift ended");
      router.push("/sign-in");
    } else {
      toast.error("Failed to End shift");
    }
  };

  const completedTrnasactions = posTransactionsReport.length;
  const heldTrnasactions = heldTransactionsReport.filter(
    (item) => item.status === "0",
  ).length;

  function findTop5PopularItems(
    items: SalesReportItem[],
  ): { parentItem: string; totalQuantity: number }[] {
    // Step 1: Initialize quantityMap
    const quantityMap: Record<string, number> = {};

    // Step 2: Aggregate quantities sold based on parent_item
    items.forEach((item) => {
      const parentItem = item.parent_item;
      const quantity = parseInt(item.quantity, 10); // Parse quantity as integer

      // Initialize quantityMap[parentItem] if it doesn't exist
      if (!quantityMap[parentItem]) {
        quantityMap[parentItem] = 0;
      }

      // Add quantity to quantityMap[parentItem]
      quantityMap[parentItem] += quantity;
    });

    // Step 3: Convert quantityMap to an array of objects for sorting
    const sortedItems = Object.keys(quantityMap).map((parentItem) => ({
      parentItem: parentItem,
      totalQuantity: quantityMap[parentItem], // This is guaranteed to be defined and a number
    }));

    // Step 4: Sort items based on totalQuantity in descending order

    sortedItems.sort((a, b) => b.totalQuantity! - a.totalQuantity!);

    // Step 5: Get the top 5 popular items
    const top5Items = sortedItems.slice(0, 5);

    return top5Items as { parentItem: string; totalQuantity: number }[];
  }
  const popularItems = findTop5PopularItems(salesReport);
  if (loading || loadingItemizedSalesReport) {
    return (
      <main className="flex min-h-[100vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
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
  }
  return (
    <DashboardLayout title={site_company?.branch ?? " Digisales"}>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <React.Suspense fallback={<Skeleton className="h-7 w-52" />}>
          <DateRangePicker
            triggerSize="sm"
            triggerClassName="ml-auto w-56 sm:w-60"
            align="end"
          />
        </React.Suspense>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {roles?.includes("mBranchManager") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex w-full flex-col">
                <div>
                  <p className="text-lg font-bold ">
                    KES{" "}
                    {dailyTargets?.status === "SUCCESS"
                      ? dailyTargets.data.sales_to_date
                      : 0}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyTargets?.status === "SUCCESS" ? achievement() : 0}%
                  achieved against
                  <span className="font-bold">
                    {" "}
                    KES{" "}
                    {dailyTargets?.status === "SUCCESS"
                      ? parseInt(dailyTargets.data.target).toLocaleString()
                      : 0}{" "}
                  </span>
                  target
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Transactions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex w-full flex-col">
              <div>
                <p className="text-lg font-bold ">{completedTrnasactions}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Transactions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex w-full flex-col">
              <div>
                <p className="text-lg font-bold ">{heldTrnasactions}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex-col items-center space-y-6 ">
            {roles?.includes("mBranchManager") && (
              <Button
                onClick={() => handleBMCheckin()}
                variant={"default"}
                className="w-full"
              >
                {!shift_started && "Start Shift"}
                {shift_started && "End Shift"}
              </Button>
            )}
            {!roles?.includes("mBranchManager") && (
              <Button
                onClick={() => handleCheckin()}
                variant={"default"}
                className="w-full"
              >
                {shift_started ? "Continue" : "Start Shift"}
              </Button>
            )}

            <div className="grid-col grid gap-4"></div>
          </div>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-8">
              {posTransactionsReport.length > 0 &&
                posTransactionsReport.slice(0, 5).map((item, index) => (
                  <div key={index} className="grid w-full grid-cols-2 ">
                    <div className="flex flex-col space-y-4">
                      <p className="text-sm font-medium leading-none">
                        {item.customername}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {JSON.parse(item.pitems).length} Item(s)
                      </p>
                    </div>
                    <div className="ml-auto flex flex-col justify-start text-xs  font-medium">
                      KES {item.ptotal}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Held Carts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8">
              {heldTransactionsReport.length > 0 &&
                heldTransactionsReport
                  .filter((item) => item.status === "0")
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="grid w-full grid-cols-2 ">
                      <div className="flex flex-col space-y-4">
                        <p className="text-sm font-medium leading-none">
                          {item.customername}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.pitems.length > 0
                            ? JSON.parse(item.pitems).length
                            : 0}{" "}
                          Item(s)
                        </p>
                      </div>
                      <div className="ml-auto flex flex-col justify-start text-xs  font-medium">
                        KES {item.ptotal}
                      </div>
                    </div>
                  ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Popular Items</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8">
              {popularItems.map((item, index) => (
                <div key={index} className="grid w-full grid-cols-2 ">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {item.parentItem}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-col justify-start text-xs  font-medium">
                    {item.totalQuantity}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default DashBoard;
