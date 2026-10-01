"use client";
import { createCatalogueCache } from "~/lib/catalogue-cache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EnhancedPriceList } from "~/hawk-tuah/types/discount-types";
import {
  fetch_all_item_inventory,
  fetch_all_sellable_items,
  fetch_item_details,
} from "~/lib/actions/inventory.actions";
import { useAuthStore } from "~/store/auth-store";
import {
  getItemPriceDetails,
  getMetadata,
  setInventory,
  setMetadata,
  setPriceList,
} from "~/utils/indexeddb";

const CATALOGUE_TTL = 30 * 60 * 1000;
const loadCachedCatalogue = createCatalogueCache<{
  basic: InventoryItem[];
  enhanced: EnhancedPriceList[];
}>(CATALOGUE_TTL);

export const catalogueKey = (site_url: string | null | undefined, site_company: SiteCompany | null | undefined, account: UserAccountInfo | null | undefined) =>
  ["inventory", site_url, site_company?.company_prefix, account?.default_store, account?.id];

export async function loadCatalogue(site_company: SiteCompany, account: UserAccountInfo, site_url: string, force = false) {
  return loadCachedCatalogue(JSON.stringify(catalogueKey(site_url, site_company, account)), async () => {
    const [basic, enhanced] = await Promise.all([
      fetch_all_sellable_items(site_company, account, site_url),
      fetch_all_item_inventory(site_company, site_url, account),
    ]);
    if (!Array.isArray(basic) || !Array.isArray(enhanced?.items)) {
      throw new Error("Could not load the catalogue");
    }
    await setInventory("inventory", basic);
    await setPriceList("priceList", enhanced.items);
    await setMetadata("metadata", new Date().toISOString());
    return { basic, enhanced: enhanced.items };
  }, force);
}

export function useCatalogue() {
  const { site_company, account, site_url } = useAuthStore();
  return useQuery({
    queryKey: catalogueKey(site_url, site_company, account),
    queryFn: () => loadCatalogue(site_company!, account!, site_url!),
    enabled: !!(site_company && account && site_url),
    staleTime: CATALOGUE_TTL,
    gcTime: CATALOGUE_TTL,
    refetchOnWindowFocus: false,
  });
}

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
async function refreshCatalogueInBackground(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
): Promise<void> {
  try {
    await loadCatalogue(site_company, account, site_url);
  } catch (error) {
    console.error("Catalogue refresh failed (non-fatal):", error);
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
        void refreshCatalogueInBackground(site_company!, account!, site_url!);
      }
    } catch (error) {
      console.error("Error fetching item details from API:", error);
      const cached = await getItemPriceDetails(stock_id!);
      if (cached) {
        details = cached;
      } else {
        // No cached fallback either — surface the real failure (network
        // error, malformed response, etc.) instead of silently returning
        // null, so the caller can show the actual error message.
        throw error;
      }
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

  const { site_company, account, site_url } = useAuthStore();
  const { data, error, isLoading } = useCatalogue();
  return {
    inventory: data?.basic || [],
    catalogue: data,
    loading: isLoading,
    error: error ? error.message : null,
    refetch: async () => {
      if (!site_company || !account || !site_url) return;
      const data = await loadCatalogue(site_company, account, site_url, true);
      queryClient.setQueryData(catalogueKey(site_url, site_company, account), data);
    },
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
    queryKey: ["itemDetails", site_url, site_company.company_prefix, account.id, account.default_store, stock_id, kit],
    queryFn: () => fetchItemDetails(stock_id, kit),
    enabled: !!(site_url && stock_id),
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


