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
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '~/store/auth-store';
import {
    fetch_all_item_inventory,
    fetch_all_sellable_items
} from '~/lib/actions/inventory.actions';
import {
    getInventory,
    getPriceList,
    setInventory,
    setPriceList,
    getMetadata,
    setMetadata
} from '~/utils/indexeddb';
import { EnhancedPriceList } from '../types/discount-types';
import { discountService } from '../services/discount-service';

/**
 * Enhanced inventory hook with discount support
 */
export const useEnhancedInventory = () => {
    const [enhancedInventoryMap, setEnhancedInventoryMap] = useState<Map<string, EnhancedPriceList>>(new Map());
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch enhanced inventory data
    const { data: inventoryData, isLoading, error, refetch } = useQuery({
        queryKey: ['enhanced-inventory'],
        queryFn: async () => {
            const { site_company, account, site_url } = useAuthStore.getState();

            if (!site_company || !account || !site_url) {
                throw new Error('Missing authentication data');
            }

            console.log('🔄 Fetching enhanced inventory data...');

            // Fetch both basic and enhanced inventory
            const [basicInventory, enhancedInventory] = await Promise.all([
                fetch_all_sellable_items(site_company, account, site_url),
                fetch_all_item_inventory(site_company, site_url, account)
            ]);

            // Store in IndexedDB for offline access
            await setInventory('inventory', basicInventory || []);
            await setPriceList('priceList', enhancedInventory || []);
            await setMetadata('metadata', new Date().toISOString());

            console.log(`✅ Loaded ${enhancedInventory?.length || 0} enhanced inventory items`);

            return {
                basic: basicInventory || [],
                enhanced: enhancedInventory || []
            };
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false
    });

    // Initialize enhanced inventory map
    useEffect(() => {
        if (inventoryData?.enhanced) {
            const map = new Map<string, EnhancedPriceList>();

            inventoryData.enhanced.forEach((item: PriceList) => {
                map.set(item.stock_id, item);
            });

            setEnhancedInventoryMap(map);
            setIsInitialized(true);

            console.log(`📋 Enhanced inventory map initialized with ${map.size} items`);
        }
    }, [inventoryData]);

    /**
     * Get enhanced item data by stock_id
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
            const storedData = await getPriceList('priceList');

            if (storedData && Array.isArray(storedData)) {
                const item = storedData.find((item: EnhancedPriceList) => item.stock_id === stock_id);
                if (item) {
                    // Add to memory cache for future use
                    enhancedInventoryMap.set(stock_id, item);
                    setEnhancedInventoryMap(new Map(enhancedInventoryMap));
                    return item;
                }
            }

            console.log(`⚠️ No enhanced data found for ${stock_id}`);
            return null;

        } catch (error) {
            console.error(`❌ Error getting enhanced item data for ${stock_id}:`, error);
            return null;
        }
    }, [enhancedInventoryMap]);

    /**
     * Get item with applied discounts (including dynamic bulk discounts)
     */
    const getItemWithDiscounts = useCallback(async (
        stock_id: string,
        cartTotal?: number
    ): Promise<EnhancedPriceList | null> => {
        try {
            const baseItem = await getEnhancedItemData(stock_id);
            if (!baseItem) return null;

            // Apply additional discount logic if needed
            // (bulk discounts are calculated at cart level, not item level)

            // Check if there are category discounts that might be better than item discounts
            const categoryDiscount = discountService.findCategoryDiscount(
                baseItem.category_id,
                parseFloat(baseItem.price)
            );

            // If category discount is better than current discount, use it
            if (categoryDiscount && categoryDiscount.discount_percent > baseItem.discount_percent) {
                const updatedItem: EnhancedPriceList = {
                    ...baseItem,
                    discount_percent: categoryDiscount.discount_percent,
                    discounted_price: parseFloat(baseItem.price) * (1 - categoryDiscount.discount_percent / 100),
                    has_discount: true,
                    discount_details: {
                        discount_id: categoryDiscount.id,
                        discount_type: 'category',
                        discount_percent: categoryDiscount.discount_percent,
                        discount_amount: parseFloat(baseItem.price) * (categoryDiscount.discount_percent / 100),
                        lower_limit: categoryDiscount.lower_limit,
                        upper_limit: categoryDiscount.upper_limit
                    }
                };

                console.log(`🎯 Applied better category discount for ${stock_id}: ${categoryDiscount.discount_percent}%`);
                return updatedItem;
            }

            return baseItem;

        } catch (error) {
            console.error(`❌ Error applying discounts for ${stock_id}:`, error);
            return null;
        }
    }, [getEnhancedItemData]);

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
        error: error?.message || null,
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