"use client";
import React from "react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import UnsynchedCard from "~/components/common/offline-card";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useOfflineInvoices } from "~/hooks/use-unsynced-invoices";

const UnsyncedInvoices = () => {
  const { unsyncedInvoices, loading, error, refetch } = useOfflineInvoices();

  console.log("unsyncedInvoices", unsyncedInvoices);
  {
    error && console.log("error", error);
  }
  if (unsyncedInvoices.length === 0 && !loading) {
    return (
      <DashboardLayout title="Unsynced Invoices">
        <main className="flex min-h-[80vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <React.Suspense
            fallback={<Skeleton className="h-7 w-52" />}
          ></React.Suspense>
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">
              Unsynched Invoices
            </h1>
          </div>

          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no Unsynched Invoices
              </h3>
              <p className="text-sm text-muted-foreground">
                Unsynched Invoices are generated when you make a sale offline
              </p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout title="Unsynced Invoices">
        <main className="flex min-h-[80vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <React.Suspense
            fallback={<Skeleton className="h-7 w-52" />}
          ></React.Suspense>
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Error</h1>
          </div>

          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                Something went wrong
              </h3>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="Unsynced Invoices">
      <main className="flex min-h-[80vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Tabs defaultValue="all">
          <div className="flex flex-row items-center justify-between space-x-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="synced">Synced</TabsTrigger>
              <TabsTrigger value="unsynced">Unsynced</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="all">
            <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {unsyncedInvoices.map((x: UnsynchedInvoice) => (
                <UnsynchedCard key={x.uid} data={x} refetch={refetch} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="unsynced">
            <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {unsyncedInvoices
                .filter((x: UnsynchedInvoice) => !x.synced)
                .map((x: UnsynchedInvoice) => (
                  <UnsynchedCard key={x.uid} data={x} refetch={refetch} />
                ))}
            </div>
          </TabsContent>
          <TabsContent value="synced">
            <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {unsyncedInvoices
                .filter((x: UnsynchedInvoice) => x.synced)
                .map((x: UnsynchedInvoice) => (
                  <UnsynchedCard key={x.uid} data={x} refetch={refetch} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
};

export default UnsyncedInvoices;
