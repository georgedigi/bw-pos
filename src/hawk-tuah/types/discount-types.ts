/**
 * Enhanced type definitions for discount system
 * Located at: hawk-tuah/types/discount-types.ts
 * 
 * These types extend the existing system without breaking compatibility
 */

// ============================================================================
// DISCOUNT RULES TYPES (from new endpoint)
// ============================================================================

export interface DiscountRule {
    id: string;
    branch_code: string;
    branch_name: string;
    discount_type: 'item' | 'category' | 'bulk';
    item_id?: string;
    item_name?: string | null;
    item_category_id?: string | null;
    item_category_name?: string | null;
    category_id?: string;
    discount_category_name?: string | null;
    lower_limit: number;
    upper_limit: number;
    discount_percent: number;
    created_by: string;
    created_date: string;
}

export interface DiscountRulesResponse {
    status: string;
    data: DiscountRule[];
}

// ============================================================================
// ENHANCED INVENTORY TYPES (from golden goose)
// ============================================================================

export interface DiscountDetails {
    discount_id: string;
    discount_type: 'item' | 'category' | 'bulk';
    discount_percent: number;
    discount_amount: number;
    lower_limit: number;
    upper_limit: number;
}

export interface EnhancedPriceList {
    stock_id: string;
    description: string;
    rate: string;
    kit: string;
    units: string;
    mb_flag: string;
    branch_code: string;
    category_id: string;
    branch_name: string;
    balance: string;
    price: string;
    discount_percent: number;
    discounted_price: number;
    discount_details: DiscountDetails | null;
    has_discount: boolean;
}

// ============================================================================
// ENHANCED CART TYPES (extends existing without breaking)
// ============================================================================

export interface EnhancedDirectSales extends Omit<DirectSales, 'item'> {
    item: InventoryItem;
    enhanced_item?: EnhancedPriceList; // Optional for backward compatibility
    original_price: number;
    automatic_discount: number;        // From backend rules
    manual_discount: string;           // Existing manual discount
    total_discount: number;            // Combined discount
    discount_breakdown: {
        type: 'item' | 'category' | 'bulk' | 'manual' | 'none';
        percentage: number;
        amount: number;
        source: string; // Rule ID or 'manual'
    }[];
}

// ============================================================================
// BULK DISCOUNT CALCULATION TYPES
// ============================================================================

export interface BulkDiscountCalculation {
    cart_subtotal: number;
    applicable_bulk_discount: DiscountRule | null;
    bulk_discount_amount: number;
    total_after_bulk_discount: number;
}

// ============================================================================
// CART ENHANCEMENT TYPES
// ============================================================================

export interface EnhancedCart extends Omit<Cart, 'items'> {
    items: EnhancedDirectSales[];
    discount_summary: {
        total_automatic_discount: number;
        total_manual_discount: number;
        bulk_discount: number;
        final_discount: number;
    };
    bulk_discount_info?: BulkDiscountCalculation;
}

// ============================================================================
// SERVICE RESPONSE TYPES
// ============================================================================

export interface DiscountServiceState {
    rules: DiscountRule[];
    last_updated: Date | null;
    is_loading: boolean;
    error: string | null;
}

// ============================================================================
// UTILITY TYPES FOR BACKWARD COMPATIBILITY
// ============================================================================

// Helper type to check if an item has enhanced data
export type ItemWithPossibleEnhancement = InventoryItem & {
    enhanced_data?: EnhancedPriceList;
};

// Type guard to check if cart uses enhanced items
export function isEnhancedCart(cart: Cart | EnhancedCart): cart is EnhancedCart {
    return 'discount_summary' in cart;
}

// Type guard to check if item has enhanced data
export function hasEnhancedData(item: any): item is EnhancedPriceList {
    return item && typeof item.discount_percent === 'number';
}