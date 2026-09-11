'use client'

/**
 * Discount Restoration Hook
 * Located at: hawk-tuah/hooks/use-discount-restoration.ts
 * 
 * Handles discount service restoration on page refresh/reload
 */

import { useEffect, useState } from 'react';
import { checkAndRestoreDiscountsOnPageLoad } from '../services/shift-discount-integration';
import { discountService } from '../services/discount-service';

/**
 * Hook to restore discount service on page load
 * Use this in your main app component or layout
 */
export const useDiscountRestoration = () => {
    const [isRestored, setIsRestored] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const restoreDiscounts = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log('🔄 Checking for discount restoration on page load...');

                const restored = await checkAndRestoreDiscountsOnPageLoad();
                setIsRestored(restored);

                if (restored) {
                    console.log('✅ Discount service restoration completed');
                } else {
                    console.log('ℹ️ No discount restoration needed');
                }

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error('❌ Discount restoration failed:', errorMessage);
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        // Only run on mount (page load)
        void restoreDiscounts();
    }, []);

    // Get current discount service state
    const discountState = discountService.getState();

    return {
        isRestored,
        isLoading,
        error,
        discountRulesCount: discountState.rules.length,
        hasDiscountRules: discountState.rules.length > 0,
        lastUpdated: discountState.last_updated
    };
};