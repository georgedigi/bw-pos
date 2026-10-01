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
import { getItemPriceDetails } from '~/utils/indexeddb';
import { EnhancedPriceList } from '../types/discount-types';
import { discountService } from '../services/discount-service';

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
            const item = await getItemPriceDetails(stock_id);
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