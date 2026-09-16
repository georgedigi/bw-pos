"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EnhancedPriceList } from "~/hawk-tuah/types/discount-types";
import {
  fetch_all_item_inventory,
  fetch_branch_inventory,
  fetch_all_sellable_items,
  fetch_item_details,
} from "~/lib/actions/inventory.actions";
import { useAuthStore } from "~/store/auth-store";
import {
  getInventory,
  getItemPriceDetails,
  getMetadata,
  setInventory,
  setMetadata,
  setPriceList,
} from "~/utils/indexeddb";

const fetchInventoryData = async (): Promise<InventoryItem[]> => {
  const { site_company, account, site_url } = useAuthStore.getState();
  const lastUpdate = await getMetadata("metadata");
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 1000 * 60 * 30);
  let list: InventoryItem[] = [];

  console.log("Last Update Timestamp:", lastUpdate);

  // KEEP existing sellable items for backward compatibility
  const sellable = await fetch_all_sellable_items(
    site_company!,
    account!,
    site_url!,
  );

  // ADD: Fetch enhanced inventory with discount data
  const enhancedInventory = await fetch_all_item_inventory(
    site_company!,
    site_url!,
    account!,
  );

  // Store both for different use cases
  await setInventory("inventory", sellable || []);
  
  // console.log('enhancedInventory type:', typeof enhancedInventory);
  // console.log('enhancedInventory value:', enhancedInventory);
  console.log('Is array?', Array.isArray(enhancedInventory));
  await setPriceList("priceList", enhancedInventory?.items || []); // (KENZY) extracts the item array from the response, should now work correctly, bloody hell! (27-06-2025)
  await setMetadata("metadata", now.toISOString());

  list = sellable || [];
  return list;
};

export const getEnhancedItemData = async (stock_id: string): Promise<EnhancedPriceList | null | undefined> => {
  try {
    const enhancedInventory = await getItemPriceDetails(stock_id);
    return enhancedInventory;
  } catch (error) {
    console.error('Failed to get enhanced item data:', error);
    return null;
  }
};

/**
 * Rebuilds the cached catalogue without blocking whoever asked for it.
 *
 * Only one runs at a time: several scans in quick succession would otherwise
 * each kick off a full catalogue download and queue behind one another.
 * Failure is deliberately silent - the metadata stamp is only written on
 * success, so the next scan simply tries again.
 */
let catalogueRefreshInFlight = false;

async function refreshCatalogueInBackground(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
  stock_id: string | undefined,
  now: Date,
): Promise<void> {
  if (catalogueRefreshInFlight) return;
  catalogueRefreshInFlight = true;
  try {
    const sellable = await fetch_all_sellable_items(site_company, account, site_url);
    const item_inventory = await fetch_all_item_inventory(site_company, site_url, account, stock_id);

    await setInventory("inventory", sellable || []);
    await setPriceList("priceList", item_inventory?.items || []);
    await setMetadata("metadata", now.toISOString());
  } catch (catalogueError) {
    console.error("Catalogue refresh failed (non-fatal):", catalogueError);
  } finally {
    catalogueRefreshInFlight = false;
  }
}

export const fetchItemDetails = async (stock_id?: string, kit?: string, forceRefresh = true): Promise<any> => {
  const { site_company, account, site_url } = useAuthStore.getState();
  const lastUpdate = await getMetadata("metadata");
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 1000 * 60 * 30); // 30 minutes ago
  let details;

  // Snippet determines whether to fetch from API or IndexedDB
  if (forceRefresh || !lastUpdate || new Date(lastUpdate) <= thirtyAgo) {
    // Fetch from Endpoint if forced or data is older than 30 minutes
    console.log("Fetching item details from Endpoint");

    try {
      // The scan result is the authoritative answer. Assign it immediately so a
      // slow/failed catalogue refresh below can never discard it.
      const item_details = await fetch_item_details(
        site_url!,
        site_company!.company_prefix,
        account!.id,
        stock_id!,
        kit!,
        undefined,
      );
      details = item_details;

      // Refresh the catalogue in the BACKGROUND when it is stale. Do not await
      // it: the scan answer is already in hand, and the full catalogue takes
      // up to 16s to build on the server. Awaiting it made the cashier wait
      // that long for an answer we already had, which is what branches
      // described as "it errors, you wait, you scan again and it works" - the
      // retry simply arrived after the server had finished rebuilding.
      if (!lastUpdate || new Date(lastUpdate) <= thirtyAgo) {
        void refreshCatalogueInBackground(site_company!, account!, site_url!, stock_id, now);
      }
    } catch (error) {
      console.error("Error fetching item details from API:", error);
      details = await getItemPriceDetails(stock_id!); // Fallback to IndexedDB on error
    }

    return details;
  } else {
    // Fetch from IndexedDB if data is within the last 30 minutes
    console.log("Fetching item details from IndexedDB");
    console.log("stock_id:", stock_id);
    const itemDetails = await getItemPriceDetails(stock_id!);

    if (itemDetails) {
      details = itemDetails;
    } else {
      // Unknown to the cache is not the same as zero stock — let the caller
      // distinguish "never checked" from "genuinely out of stock".
      details = null;
    }
    return details;
  }
};



export const useInventory = () => {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery<InventoryItem[], Error>({
    queryKey: ["inventory"],
    queryFn: fetchInventoryData,
  });

  // console.log("Inventory Data:", data);
  console.log("Is Loading:", isLoading);
  console.log("Error:", error);

  return {
    inventory: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  };
};

export const useItemDetails = (
  site_url: string,
  site_company: SiteCompany,
  account: UserAccountInfo,
  stock_id?: string,
  kit?: string,
) => {
  return useQuery({
    queryKey: ["itemDetails", stock_id],
    queryFn: () => fetchItemDetails(stock_id, kit),
    enabled: !(stock_id?.length === 0),
    retry: 2
    // fetch_item_details(
    //   site_url,
    //   site_company.company_prefix,
    //   account.id,
    //   stock_id!,
    //   kit!,
    //   undefined,
    // ),

    // enabled: !!stock_id && !!kit,
  });
};


