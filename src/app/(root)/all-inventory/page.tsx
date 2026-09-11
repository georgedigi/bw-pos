'use client'

import React from "react"
import { DashboardLayout } from "~/components/common/dashboard-layout"
import { DataTable } from "~/components/data-table"
import { Shell } from "~/components/shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { useInventory } from "~/hooks/useInventory"
import { inventoryColumns } from "~/lib/TableUtils"
import { useAuthStore } from "~/store/auth-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { useSiteInventory } from "~/hooks/useSiteInventory"

type StockItem = {
  stock_id: string
  item: string
  selling_price: string
  pulldown: string
  balance: string
  branch_name?: string
  description: string
}

const AllInventoryPage = () => {
  const { site_company } = useAuthStore()
  const { siteInventory, loading, error } = useSiteInventory()
  const [selectedBranch, setSelectedBranch] = React.useState("all")

  console.log("All site inventory data: ", siteInventory)

  // Get unique branches
  const branches = React.useMemo(() => {
    if (!siteInventory) return []
    const uniqueBranches = new Set(
        siteInventory
        .map(item => item.branch_name?.trim() || "")
        .filter(Boolean)
    )
    return Array.from(uniqueBranches).sort()
  }, [siteInventory])

  // Filter inventory for selected branch
  const branchInventory = React.useMemo(() => {
    if (!siteInventory) return []

    const transformedData: StockItem[] = siteInventory.map(item => ({
      stock_id: item.stock_id,
      item: item.description || item.item, 
      selling_price: item.price || item.selling_price,
      pulldown: item.pulldown || "0",
      balance: item.balance,
      branch_name: item.branch_name,
      description: item.description,
    }))

    return selectedBranch === "all" 
      ? transformedData
      : transformedData.filter(item => item.branch_name?.trim() === selectedBranch)
  }, [siteInventory, selectedBranch])

  // Filter categories based on branch inventory
  const saleable_inventory = branchInventory.filter(
    (item) => item.stock_id !== "CR0001" && item.stock_id !== "CR0002"
  )

  const non_saleable_inventory = branchInventory.filter(
    (item) => item.stock_id === "CR0001" || item.stock_id === "CR0002"
  )

  const pulldownItems = branchInventory.filter(
    (item) => item.pulldown !== "0"
  )

  if (loading) {
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
          <span className="sr-only">Loading...</span>
        </div>
      </main>
    )
  }

  return (
    <DashboardLayout title={site_company?.branch ?? ""}>
      <main className="flex min-h-[60vh] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">All Branches Inventory</h1>
          <Select
            value={selectedBranch}
            onValueChange={setSelectedBranch}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {branchInventory.length === 0 && !loading && !error ? (
          <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no products
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start selling as soon as you add a product to your inventory.
              </p>
            </div>
          </div>
        ) : (
          <Shell className="gap-2">
            <Tabs defaultValue="all">
              <div className="flex items-center">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="saleable">Saleable</TabsTrigger>
                  <TabsTrigger value="non-saleable">Non Saleable</TabsTrigger>
                  <TabsTrigger value="pulldown">Pulldown</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <DataTable
                  columns={inventoryColumns}
                  data={branchInventory}
                  filCol="stock_id"
                  onRowClick={(rowData) => console.log(rowData)}
                />
              </TabsContent>
              <TabsContent value="saleable">
                <DataTable
                  columns={inventoryColumns}
                  data={saleable_inventory}
                  filCol="stock_id"
                  onRowClick={(rowData) => console.log(rowData)}
                />
              </TabsContent>
              <TabsContent value="non-saleable">
                <DataTable
                  columns={inventoryColumns}
                  data={non_saleable_inventory}
                  filCol="stock_id"
                  onRowClick={(rowData) => console.log(rowData)}
                />
              </TabsContent>
              <TabsContent value="pulldown">
                <DataTable
                  columns={inventoryColumns}
                  data={pulldownItems}
                  filCol="stock_id"
                  onRowClick={(rowData) => console.log(rowData)}
                />
              </TabsContent>
            </Tabs>
          </Shell>
        )}
      </main>
    </DashboardLayout>
  )
}

export default AllInventoryPage