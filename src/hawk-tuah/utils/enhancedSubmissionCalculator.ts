/**
 * Enhanced Submission Calculator
 * 
 * Calculates final prices for backend submission including all discounts
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import { calculateEnhancedCartTotals } from "./discountCalculator";


export interface EnhancedSubmissionItem {
    stock_id: string;
    description: string;
    quantity: number;
    original_price: number;
    final_price: number;              // After automatic + manual discounts
    manual_discount: number;
    automatic_discount: number;
    total_discount: number;
    line_total: number;               // final_price * quantity
    tax_rate: string;
    kit: string;
    rate: string;
    max_quantity: number;
}

export interface EnhancedSubmissionData {
    items: EnhancedSubmissionItem[];
    totals: {
        subtotal: number;               // Sum of original prices
        total_automatic_discounts: number;
        total_manual_discounts: number;
        bulk_discount: number;
        final_total: number;            // What customer actually pays
    };
}

/**
 * Calculate final prices for backend submission
 */
export function calculateSubmissionData(cart: Cart): EnhancedSubmissionData {
    if (!cart || !cart.items || cart.items.length === 0) {
        return {
            items: [],
            totals: {
                subtotal: 0,
                total_automatic_discounts: 0,
                total_manual_discounts: 0,
                bulk_discount: 0,
                final_total: 0
            }
        };
    }

    // Get enhanced calculations
    const calculations = calculateEnhancedCartTotals(cart);

    // Calculate final price for each item
    const enhancedItems: EnhancedSubmissionItem[] = cart.items.map(item => {
        // Get original price (before any discounts)
        const originalPrice = item.enhanced_item?.has_discount
            ? parseFloat(item.enhanced_item.price)  // Original price from enhanced data
            : item.details.price;                   // Fallback to current price

        // Get automatic discount amount per unit
        const automaticDiscountPerUnit = item.enhanced_item?.has_discount
            ? parseFloat(item.enhanced_item.price) - item.enhanced_item.discounted_price
            : 0;

        // Get manual discount (total for all quantity)
        const manualDiscountTotal = parseFloat(item.discount || "0");
        const manualDiscountPerUnit = manualDiscountTotal / item.quantity;

        // Calculate final price per unit
        const priceAfterAutomaticDiscount = originalPrice - automaticDiscountPerUnit;
        const finalPricePerUnit = priceAfterAutomaticDiscount - manualDiscountPerUnit;

        // Calculate line total
        const lineTotal = finalPricePerUnit * item.quantity;

        return {
            stock_id: item.item.stock_id,
            description: item.item.description,
            quantity: item.quantity,
            original_price: originalPrice,
            final_price: Math.max(0, finalPricePerUnit), // Ensure non-negative
            manual_discount: manualDiscountTotal,
            automatic_discount: automaticDiscountPerUnit * item.quantity,
            total_discount: (automaticDiscountPerUnit * item.quantity) + manualDiscountTotal,
            line_total: Math.max(0, lineTotal), // Ensure non-negative
            tax_rate: item.item.rate,
            kit: item.item.kit,
            rate: item.item.rate,
            max_quantity: item.max_quantity
        };
    });

    return {
        items: enhancedItems,
        totals: {
            subtotal: calculations.subtotal,
            total_automatic_discounts: calculations.totalItemDiscounts,
            total_manual_discounts: calculations.totalManualDiscounts,
            bulk_discount: calculations.bulkDiscount.bulk_discount_amount,
            final_total: calculations.finalTotal
        }
    };
}

/**
 * Format enhanced items for backend submission
 * This replaces the items mapping in submit_direct_sale_request
 */
export function formatItemsForSubmission(
    enhancedItems: EnhancedSubmissionItem[],
    customer: Customer
) {
    return enhancedItems.map((item) => {
        // Calculate tax based on final price (not original price)
        const tax = (parseInt(item.tax_rate) * item.final_price) / 100;

        return {
            quantity: item.quantity.toFixed(2),
            quantityAval: item.max_quantity.toFixed(2),
            booking_id: "",
            customer_option: customer.br_name,
            customer_option_id: customer.branch_code,
            booking_type: "",
            discount: item.total_discount.toFixed(2), // Total discount (automatic + manual)
            mode_prices: "1",
            kit: item.kit,
            batch_no: "",
            tax: tax.toFixed(2), // Tax calculated on final price
            item_option: item.description,
            item_option_id: item.stock_id,
            rate: item.rate,
            deposit: "",
            total: item.line_total.toFixed(2), // Line total using final price
            price: item.original_price.toFixed(2), // Price before discounts, I know, does the same as original_price but what do I know, you have to follow the rules!!
            discounted_price: item.final_price.toFixed(2), // Final price after all discounts
            posBatchSelect: "",
            bottles_issued: "", // Will be filled from original item if needed
            bottles_returned: "", // Will be filled from original item if needed
            fsalesp: "",
            // 🎯 ADD TRANSPARENCY FIELDS FOR RECEIPT
            original_price: item.original_price.toFixed(2),
            automatic_discount: item.automatic_discount.toFixed(2),
            manual_discount: item.manual_discount.toFixed(2),
        };
    });
}

/**
 * Log submission data for debugging
 */
export function logSubmissionData(submissionData: EnhancedSubmissionData) {
    console.group('💰 Enhanced Submission Data');

    console.log('📊 Totals:', submissionData.totals);

    console.table(submissionData.items.map(item => ({
        item: item.description,
        qty: item.quantity,
        original: item.original_price.toFixed(2),
        final: item.final_price.toFixed(2),
        saved: item.total_discount.toFixed(2),
        lineTotal: item.line_total.toFixed(2)
    })));

    console.groupEnd();
}