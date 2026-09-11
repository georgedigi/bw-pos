/**
 * Discount Calculator - Handles all discount calculations
 * Located at: hawk-tuah/utils/discount-calculator.ts
 * 
 * Handles:
 * - Item-level discounts (from golden goose)
 * - Bulk discount calculations
 * - Cart total calculations with discounts
 * - Discount transparency for receipts
 */

import { discountService } from '../services/discount-service';
import {
    EnhancedDirectSales,
    BulkDiscountCalculation,
    EnhancedCart,
    DiscountRule
} from '../types/discount-types';

/**
 * Calculate enhanced cart totals with all discount types
 */
export function calculateEnhancedCartTotals(cart: Cart): {
    subtotal: number;
    totalItemDiscounts: number;
    totalManualDiscounts: number;
    bulkDiscount: BulkDiscountCalculation;
    finalTotal: number;
    discountBreakdown: Array<{
        type: string;
        amount: number;
        description: string;
    }>;
} {
    if (!cart || !cart.items || cart.items.length === 0) {
        return {
            subtotal: 0,
            totalItemDiscounts: 0,
            totalManualDiscounts: 0,
            bulkDiscount: {
                cart_subtotal: 0,
                applicable_bulk_discount: null,
                bulk_discount_amount: 0,
                total_after_bulk_discount: 0
            },
            finalTotal: 0,
            discountBreakdown: []
        };
    }

    // Calculate subtotal and item-level discounts
    let subtotal = 0;
    let totalItemDiscounts = 0;
    let totalManualDiscounts = 0;
    const discountBreakdown: Array<{ type: string; amount: number; description: string }> = [];

    cart.items.forEach((item) => {
        const itemSubtotal = item.quantity * item.details.price;
        subtotal += itemSubtotal;

        // Manual discount (existing system)
        const manualDiscount = parseFloat(item.discount || "0");
        totalManualDiscounts += manualDiscount;

        // Item-level automatic discount (from enhanced data)
        if (item.enhanced_item?.has_discount) {
            const originalPrice = parseFloat(item.enhanced_item.price);
            const discountedPrice = item.enhanced_item.discounted_price;
            const itemDiscountAmount = (originalPrice - discountedPrice) * item.quantity;
            totalItemDiscounts += itemDiscountAmount;

            discountBreakdown.push({
                type: item.enhanced_item.discount_details?.discount_type || 'item',
                amount: itemDiscountAmount,
                description: `${item.enhanced_item.discount_details?.discount_percent}% off ${item.item.description}`
            });
        }

        if (manualDiscount > 0) {
            discountBreakdown.push({
                type: 'manual',
                amount: manualDiscount,
                description: `Manual discount on ${item.item.description}`
            });
        }
    });

    // Calculate bulk discount on cart subtotal (after item discounts)
    const subtotalAfterItemDiscounts = subtotal - totalManualDiscounts;
    const bulkDiscount = calculateBulkDiscount(subtotalAfterItemDiscounts);

    // Add bulk discount to breakdown
    if (bulkDiscount.bulk_discount_amount > 0) {
        discountBreakdown.push({
            type: 'bulk',
            amount: bulkDiscount.bulk_discount_amount,
            description: `${bulkDiscount.applicable_bulk_discount?.discount_percent}% bulk discount`
        });
    }

    const finalTotal = subtotalAfterItemDiscounts - bulkDiscount.bulk_discount_amount;

    return {
        subtotal,
        totalItemDiscounts,
        totalManualDiscounts,
        bulkDiscount,
        finalTotal: Math.max(0, finalTotal), // Ensure non-negative
        discountBreakdown
    };
}

/**
 * Calculate bulk discount for cart total
 */
export function calculateBulkDiscount(cartTotal: number): BulkDiscountCalculation {
    const applicableBulkDiscount = discountService.findBulkDiscount(cartTotal);

    let bulkDiscountAmount = 0;
    if (applicableBulkDiscount) {
        bulkDiscountAmount = (applicableBulkDiscount.discount_percent / 100) * cartTotal;
    }

    return {
        cart_subtotal: cartTotal,
        applicable_bulk_discount: applicableBulkDiscount,
        bulk_discount_amount: bulkDiscountAmount,
        total_after_bulk_discount: cartTotal - bulkDiscountAmount
    };
}

/**
 * Get item pricing info with all discounts applied
 */
export function getItemPricingInfo(item: DirectSales): {
    originalPrice: number;
    currentPrice: number;
    automaticDiscount: number;
    manualDiscount: number;
    totalDiscount: number;
    discountPercentage: number;
    hasAnyDiscount: boolean;
} {
    const originalPrice = item.enhanced_item?.has_discount
        ? parseFloat(item.enhanced_item.price)
        : item.details.price;

    const automaticDiscount = item.enhanced_item?.has_discount
        ? (parseFloat(item.enhanced_item.price) - item.enhanced_item.discounted_price) * item.quantity
        : 0;

    const manualDiscount = parseFloat(item.discount || "0");
    const totalDiscount = automaticDiscount + manualDiscount;

    const currentPrice = item.details.price;
    const totalItemValue = originalPrice * item.quantity;
    const discountPercentage = totalItemValue > 0 ? (totalDiscount / totalItemValue) * 100 : 0;

    return {
        originalPrice,
        currentPrice,
        automaticDiscount,
        manualDiscount,
        totalDiscount,
        discountPercentage,
        hasAnyDiscount: totalDiscount > 0
    };
}

/**
 * Convert regular cart to enhanced cart (backward compatibility)
 */
export function enhanceCart(cart: Cart): EnhancedCart {
    const calculations = calculateEnhancedCartTotals(cart);

    const enhancedItems: EnhancedDirectSales[] = cart.items.map(item => {
        const pricingInfo = getItemPricingInfo(item);

        return {
            ...item,
            original_price: pricingInfo.originalPrice,
            automatic_discount: pricingInfo.automaticDiscount,
            manual_discount: item.discount || "0",
            total_discount: pricingInfo.totalDiscount,
            discount_breakdown: [{
                type: item.enhanced_item?.discount_details?.discount_type || 'none',
                percentage: item.enhanced_item?.discount_percent || 0,
                amount: pricingInfo.automaticDiscount,
                source: item.enhanced_item?.discount_details?.discount_id || 'none'
            }]
        } as EnhancedDirectSales;
    });

    return {
        cart_id: cart.cart_id,
        items: enhancedItems,
        discount_summary: {
            total_automatic_discount: calculations.totalItemDiscounts,
            total_manual_discount: calculations.totalManualDiscounts,
            bulk_discount: calculations.bulkDiscount.bulk_discount_amount,
            final_discount: calculations.totalItemDiscounts + calculations.totalManualDiscounts + calculations.bulkDiscount.bulk_discount_amount
        },
        bulk_discount_info: calculations.bulkDiscount
    };
}

/**
 * Check if cart qualifies for bulk discount and return next threshold info
 */
export function getBulkDiscountProgress(cartTotal: number): {
    currentDiscount: DiscountRule | null;
    nextThreshold: DiscountRule | null;
    amountToNextDiscount: number;
    progressPercentage: number;
} {
    console.log(`Calculating bulk discount progress for cart total: ${cartTotal}`);
    const currentDiscount = discountService.findBulkDiscount(cartTotal);
    const allBulkDiscounts = discountService.getDiscountRules('bulk')
        .sort((a, b) => a.lower_limit - b.lower_limit);

    let nextThreshold: DiscountRule | null = null;
    let amountToNextDiscount = 0;

    // Find next higher threshold
    for (const rule of allBulkDiscounts) {
        if (cartTotal < rule.lower_limit) {
            nextThreshold = rule;
            amountToNextDiscount = rule.lower_limit - cartTotal;
            break;
        }
    }

    // Calculate progress to next threshold
    let progressPercentage = 0;
    if (nextThreshold) {
        const previousThreshold = currentDiscount?.lower_limit || 0;
        const totalGap = nextThreshold.lower_limit - previousThreshold;
        const currentProgress = cartTotal - previousThreshold;
        progressPercentage = totalGap > 0 ? (currentProgress / totalGap) * 100 : 0;
    }

    return {
        currentDiscount,
        nextThreshold,
        amountToNextDiscount,
        progressPercentage: Math.min(100, Math.max(0, progressPercentage))
    };
}