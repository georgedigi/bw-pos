"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchAllItemsInSiteInventory,
} from "~/lib/actions/inventory.actions";
import { useAuthStore } from "~/store/auth-store";
import {
    getInventory,
    getMetadata,
    setInventory,
    setMetadata,
} from "~/utils/indexeddb";

const fetchSiteInventoryData = async (): Promise<InventoryItem[]> => {
    const { site_company, account, site_url } = useAuthStore.getState();
    const lastUpdate = await getMetadata("metadata");
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 1000 * 60 * 30); // 30 minutes ago
    let list: InventoryItem[] = [];

    console.log("Last Update Timestamp:", lastUpdate);
    console.log("Current Time:", now);
    console.log("Thirty Minutes Ago:", thirtyAgo);

    //   if (lastUpdate && new Date(lastUpdate) >= thirtyAgo) {
    //     console.log("Fetching site inventory from IndexedDB");
    //     const inventory = await getInventory("inventory", "");
    //     if (inventory) {
    //       list = inventory;
    //       return list;
    //     }
    //   }

    // Fetch from API if no cached data or cache is expired
    const siteInventory = await fetchAllItemsInSiteInventory(
        site_company!,
        site_url!,
        // account!,
    );

    // Store the fetched data
    if (siteInventory) {
        await setInventory("inventory", siteInventory || []);
        await setMetadata("metadata", now.toISOString());
        list = siteInventory || [];
    }

    return list;
};

export const useSiteInventory = () => {
    const queryClient = useQueryClient();

    const { data, error, isLoading } = useQuery<InventoryItem[], Error>({
        queryKey: ["siteInventory"],
        queryFn: fetchSiteInventoryData,
    });

    // Log states for debugging
    console.log("Is Loading:", isLoading);
    console.log("Error:", error);

    return {
        siteInventory: data || [],
        loading: isLoading,
        error: error ? error.message : null,
        refetch: () => queryClient.invalidateQueries({ queryKey: ["siteInventory"] }),
    };
};