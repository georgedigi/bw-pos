/**
 * Enhanced Inventory Hook - Integrates discount system with inventory
 * 
 * Provides enhanced inventory data with discount information
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useInventory } from "~/hooks/useInventory";
import { fetch_all_item_inventory } from '~/lib/actions/inventory.actions';
import { useAuthStore } from '~/store/auth-store';
import { getEnhancedPriceRecord, putEnhancedPriceRecord } from '~/utils/indexeddb';
import { EnhancedPriceList } from '../types/discount-types';
import { discountService } from '../services/discount-service';
import { applyBetterRule, pickScannedItem } from '../utils/scan-discount';

/**
 * Enhanced inventory hook with discount support
 */
export const useEnhancedInventory = () => {
    const [enhancedInventoryMap, setEnhancedInventoryMap] = useState<Map<string, EnhancedPriceList>>(new Map());
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch enhanced inventory data
    const { catalogue: inventoryData, loading: isLoading, error, refetch } = useInventory();

    // Initialize enhanced inventory map
    useEffect(() => {
        if (inventoryData?.enhanced) {
            const map = new Map<string, EnhancedPriceList>();

            inventoryData.enhanced.forEach((item: EnhancedPriceList) => {
                map.set(item.stock_id, item);
            });

            setEnhancedInventoryMap(map);
            setIsInitialized(true);

            console.log(`📋 Enhanced inventory map initialized with ${map.size} items`);
        }
    }, [inventoryData]);

    /**
     * Get enhanced item data by stock_id from the local catalogue copy
     */
    const getEnhancedItemData = useCallback(async (stock_id: string): Promise<EnhancedPriceList | null> => {
        try {
            // First try from memory cache
            const cachedItem = enhancedInventoryMap.get(stock_id);
            if (cachedItem) {
                console.log(`📦 Found enhanced data for ${stock_id} in cache`);
                return cachedItem;
            }

            // If not in memory, try IndexedDB
            console.log(`🔍 Searching IndexedDB for enhanced data: ${stock_id}`);
            const item = await getEnhancedPriceRecord(stock_id);
            if (item) {
                setEnhancedInventoryMap(previous => new Map(previous).set(stock_id, item));
                return item;
            }

            console.log(`⚠️ No enhanced data found for ${stock_id}`);
            return null;

        } catch (error) {
            console.error(`❌ Error getting enhanced item data for ${stock_id}:`, error);
            return null;
        }
    }, [enhancedInventoryMap]);

    /**
     * Ask the server for this one item's current price and discount.
     *
     * The catalogue copy is downloaded once and can be many minutes old, so a
     * discount approved after the till loaded never reached a scan until the
     * cashier refreshed the browser. The scan must price from the server's
     * answer at the moment of the scan; the catalogue is only the fallback.
     */
    const fetchLiveItemData = useCallback(async (stock_id: string): Promise<EnhancedPriceList | null> => {
        const { site_company, account, site_url } = useAuthStore.getState();
        if (!site_company || !account || !site_url) return null;
        try {
            const response = await fetch_all_item_inventory(site_company, site_url, account, stock_id);
            const item = pickScannedItem(response?.items, stock_id);
            if (!item) return null;
            setEnhancedInventoryMap(previous => new Map(previous).set(stock_id, item));
            void putEnhancedPriceRecord(item).catch(error =>
                console.error(`Could not cache live price for ${stock_id} (non-fatal):`, error));
            return item;
        } catch (error) {
            console.error(`Live price lookup failed for ${stock_id}, using cached catalogue:`, error);
            return null;
        }
    }, []);

    /**
     * Get item with applied discounts (including dynamic bulk discounts)
     */
    const getItemWithDiscounts = useCallback(async (
        stock_id: string,
        cartTotal?: number
    ): Promise<EnhancedPriceList | null> => {
        try {
            const liveItem = await fetchLiveItemData(stock_id);
            const baseItem = liveItem ?? await getEnhancedItemData(stock_id);
            if (!baseItem) return null;

            // (bulk discounts are calculated at cart level, not item level)
            const price = parseFloat(baseItem.price);
            let item = baseItem;

            // Offline / server unreachable: the cached record may predate a new
            // item discount, so also check the rules, which refresh every 10 min.
            if (!liveItem) {
                item = applyBetterRule(item, discountService.findItemDiscount(stock_id, price));
            }

            // Check if there are category discounts that might be better than item discounts
            const withCategory = applyBetterRule(item, discountService.findCategoryDiscount(baseItem.category_id, price));
            if (withCategory !== item) {
                console.log(`🎯 Applied better category discount for ${stock_id}: ${withCategory.discount_percent}%`);
            }
            return withCategory;

        } catch (error) {
            console.error(`❌ Error applying discounts for ${stock_id}:`, error);
            return null;
        }
    }, [fetchLiveItemData, getEnhancedItemData]);

    /**
     * Get all enhanced inventory items
     */
    const getAllEnhancedItems = useCallback((): EnhancedPriceList[] => {
        return Array.from(enhancedInventoryMap.values());
    }, [enhancedInventoryMap]);

    /**
     * Search enhanced inventory
     */
    const searchEnhancedInventory = useCallback((searchTerm: string): EnhancedPriceList[] => {
        const allItems = getAllEnhancedItems();
        const term = searchTerm.toLowerCase();

        return allItems.filter(item =>
            item.stock_id.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term)
        );
    }, [getAllEnhancedItems]);

    /**
     * Get discount statistics
     */
    const getDiscountStats = useCallback(() => {
        const allItems = getAllEnhancedItems();
        const discountedItems = allItems.filter(item => item.has_discount);

        return {
            totalItems: allItems.length,
            discountedItems: discountedItems.length,
            discountPercentage: allItems.length > 0 ? (discountedItems.length / allItems.length) * 100 : 0,
            averageDiscount: discountedItems.length > 0
                ? discountedItems.reduce((sum, item) => sum + item.discount_percent, 0) / discountedItems.length
                : 0
        };
    }, [getAllEnhancedItems]);

    return {
        // Data
        inventory: inventoryData?.basic || [],
        enhancedInventory: Array.from(enhancedInventoryMap.values()),

        // State
        isLoading,
        error,
        isInitialized,

        // Methods
        getEnhancedItemData,
        getItemWithDiscounts,
        searchEnhancedInventory,
        getAllEnhancedItems,
        getDiscountStats,
        refetch,

        // Stats
        stats: getDiscountStats()
    };
};