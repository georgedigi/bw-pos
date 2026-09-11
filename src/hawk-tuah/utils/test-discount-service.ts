/**
 * Test utility for discount service
 * Located at: hawk-tuah/utils/test-discount-service.ts
 * 
 * Use this to test if discount service is working properly
 */

import { discountService } from '../services/discount-service';

/**
 * Test function - call this from browser console or component
 */
export async function testDiscountService() {
    console.log('🧪 Testing Discount Service...');

    const state = discountService.getState();

    console.log('📊 Service State:', {
        rulesLoaded: state.rules.length,
        lastUpdated: state.last_updated,
        isLoading: state.is_loading,
        hasError: !!state.error,
        error: state.error
    });

    if (state.rules.length > 0) {
        console.log('📋 Available Discount Rules:');

        // Group rules by type
        const rulesByType = {
            item: state.rules.filter(r => r.discount_type === 'item'),
            category: state.rules.filter(r => r.discount_type === 'category'),
            bulk: state.rules.filter(r => r.discount_type === 'bulk')
        };

        console.table(rulesByType.item);
        console.table(rulesByType.category);
        console.table(rulesByType.bulk);

        // Test discount lookups
        console.log('🔍 Testing Discount Lookups:');

        // Test item discount
        if (rulesByType.item.length > 0) {
            const itemRule = rulesByType.item[0];
            const testPrice = (itemRule!.lower_limit + itemRule!.upper_limit) / 2;
            const foundDiscount = discountService.findItemDiscount(itemRule!.item_id!, testPrice);
            console.log(`Item Discount Test:`, {
                searchFor: itemRule!.item_id,
                testPrice,
                found: !!foundDiscount,
                discount: foundDiscount?.discount_percent
            });
        }

        // Test bulk discount
        if (rulesByType.bulk.length > 0) {
            const bulkRule = rulesByType.bulk[0];
            const testTotal = (bulkRule!.lower_limit + bulkRule!.upper_limit) / 2;
            const foundBulkDiscount = discountService.findBulkDiscount(testTotal);
            console.log(`Bulk Discount Test:`, {
                testTotal,
                found: !!foundBulkDiscount,
                discount: foundBulkDiscount?.discount_percent
            });
        }

        console.log('✅ Discount Service Test Complete');
        return true;
    } else {
        console.log('❌ No discount rules loaded');
        return false;
    }
}

/**
 * Quick status check - returns simple boolean
 */
export function isDiscountServiceReady(): boolean {
    const state = discountService.getState();
    return state.rules.length > 0 && !state.error;
}

/**
 * Get human-readable status
 */
export function getDiscountServiceSummary(): string {
    const state = discountService.getState();

    if (state.is_loading) return 'Loading discount rules...';
    if (state.error) return `Error: ${state.error}`;
    if (state.rules.length === 0) return 'No discount rules loaded';

    const rulesByType = {
        item: state.rules.filter(r => r.discount_type === 'item').length,
        category: state.rules.filter(r => r.discount_type === 'category').length,
        bulk: state.rules.filter(r => r.discount_type === 'bulk').length
    };

    return `Ready: ${rulesByType.item} item, ${rulesByType.category} category, ${rulesByType.bulk} bulk discounts`;
}

// Export for easy browser console testing
if (typeof window !== 'undefined') {
    (window as any).testDiscountService = testDiscountService;
    (window as any).getDiscountServiceSummary = getDiscountServiceSummary;
}