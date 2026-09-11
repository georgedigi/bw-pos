/**
 * Shift-Discount Integration Service
 * 
 * Integrates discount service with existing shift management
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import { discountService } from './discount-service';
import { useAuthStore } from '~/store/auth-store';

/**
 * Initialize discount service when shift starts
 * Call this after successful shift start
 */
export async function initializeDiscountsForShift(): Promise<boolean> {
    try {
        const { site_url, site_company, account } = useAuthStore.getState();

        if (!site_url || !site_company || !account) {
            console.error('❌ Missing auth data for discount initialization');
            return false;
        }

        console.log('🎯 Initializing discounts for shift...');

        await discountService.initialize(
            site_url,
            site_company.company_prefix,
            account.default_store || ''
        );

        console.log('✅ Discount service initialized for shift');
        return true;

    } catch (error) {
        console.error('❌ Failed to initialize discount service:', error);
        return false;
    }
}

/**
 * Check and restore discount service on page load/refresh
 * Call this when app initializes to handle refresh scenarios
 */
export async function checkAndRestoreDiscountsOnPageLoad(): Promise<boolean> {
    try {
        // Check if there's an active shift
        const shiftData = localStorage.getItem('start_shift');
        if (!shiftData) {
            console.log('ℹ️ No active shift found, skipping discount restoration');
            return false;
        }

        const shift = JSON.parse(shiftData);
        const { site_url, site_company, account } = useAuthStore.getState();

        if (!shift.user_id || !account || shift.user_id !== account.id) {
            console.log('⚠️ Shift user mismatch, clearing old shift data');
            localStorage.removeItem('start_shift');
            return false;
        }

        // Check if discount service already has rules (restored from storage)
        const currentState = discountService.getState();
        if (currentState.rules.length > 0) {
            console.log(`✅ Discount service already restored with ${currentState.rules.length} rules`);

            // Restart periodic refresh if needed
            if (site_url && site_company && account) {
                console.log('🔄 Restarting periodic discount refresh...');
                await discountService.initialize(
                    site_url,
                    site_company.company_prefix,
                    account.default_store || ''
                );
            }
            return true;
        }

        // If no rules in memory, try to fetch fresh data
        if (site_url && site_company && account) {
            console.log('🔄 No discount rules in memory, fetching fresh data...');
            await initializeDiscountsForShift();
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Failed to restore discounts on page load:', error);
        return false;
    }
}

/**
 * Cleanup discount service when shift ends
 * Call this when shift ends
 */
export function cleanupDiscountsForShift(): void {
    try {
        console.log('🧹 Cleaning up discount service for shift end...');
        discountService.stopPeriodicRefresh();
        discountService.clearCache();
        console.log('✅ Discount service cleaned up');
    } catch (error) {
        console.error('❌ Error cleaning up discount service:', error);
    }
}

/**
 * Get discount service status for debugging
 */
export function getDiscountServiceStatus() {
    const state = discountService.getState();
    return {
        isInitialized: state.rules.length > 0,
        lastUpdated: state.last_updated,
        rulesCount: state.rules.length,
        isLoading: state.is_loading,
        hasError: !!state.error,
        error: state.error
    };
}