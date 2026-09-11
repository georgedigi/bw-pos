"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch_branch_inventory } from "~/lib/actions/inventory.actions";
import { useAuthStore } from "~/store/auth-store";

const fetchBranchInventoryData = async (): Promise<StockItem[]> => {
  const { site_company, account, site_url } = useAuthStore.getState();

  // Fetch from API
  const items = await fetch_branch_inventory(
    site_company!,
    account!,
    site_url!,
  );

  const list = items ?? [];
  return list;
};

export const useBranchInventory = () => {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<StockItem[], Error>({
    queryKey: ["branchInventory"],
    queryFn: fetchBranchInventoryData,
    // staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    inventory: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["branchInventory"] }),
  };
};
