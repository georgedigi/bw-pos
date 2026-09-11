/**
 * Enhanced Amount Input - Integrates discount system with payment processing
 * 
 * This replaces the payment calculations in your existing AmountInput component
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import { useCartStore } from "~/store/cart-store";
import { calculateEnhancedCartTotals } from "../utils/discountCalculator";
import { formatMoney } from "../utils/formatters";

/**
 * Hook to get enhanced cart calculations for payment
 */
export const useEnhancedPaymentCalculations = () => {
    const { currentCart } = useCartStore();

    if (!currentCart) {
        return {
            subtotal: 0,
            totalItemDiscounts: 0,
            totalManualDiscounts: 0,
            bulkDiscountAmount: 0,
            finalTotal: 0,
            totalSavings: 0,
            isEnhanced: false
        };
    }

    const calculations = calculateEnhancedCartTotals(currentCart);

    return {
        subtotal: calculations.subtotal,
        totalItemDiscounts: calculations.totalItemDiscounts,
        totalManualDiscounts: calculations.totalManualDiscounts,
        bulkDiscountAmount: calculations.bulkDiscount.bulk_discount_amount,
        finalTotal: calculations.finalTotal,
        totalSavings: calculations.totalItemDiscounts + calculations.totalManualDiscounts + calculations.bulkDiscount.bulk_discount_amount,
        discountBreakdown: calculations.discountBreakdown,
        isEnhanced: true
    };
};

/**
 * Enhanced Payment Summary Component
 * Use this to replace the payment calculations in your AmountInput
 */
export const EnhancedPaymentSummary = ({
    paid,
    value,
    onChange
}: {
    paid: number;
    value: string;
    onChange: (value: string) => void;
}) => {
    const calculations = useEnhancedPaymentCalculations();
    const balance = calculations.finalTotal - paid;

    return (
        <div className="flex w-full flex-col space-y-4 py-4">

            {/* Subtotal */}
            <div className="flex w-full flex-row justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatMoney(calculations.subtotal)}</span>
            </div>

            {/* Show discount breakdown if any discounts exist */}
            {calculations.totalSavings > 0 && (
                <>
                    {calculations.totalItemDiscounts > 0 && (
                        <div className="flex w-full flex-row justify-between text-green-600">
                            <span className="text-sm">Item Discounts</span>
                            <span>-{formatMoney(calculations.totalItemDiscounts)}</span>
                        </div>
                    )}

                    {calculations.totalManualDiscounts > 0 && (
                        <div className="flex w-full flex-row justify-between text-green-600">
                            <span className="text-sm">Manual Discounts</span>
                            <span>-{formatMoney(calculations.totalManualDiscounts)}</span>
                        </div>
                    )}

                    {calculations.bulkDiscountAmount > 0 && (
                        <div className="flex w-full flex-row justify-between text-green-600">
                            <span className="text-sm">Bulk Discount</span>
                            <span>-{formatMoney(calculations.bulkDiscountAmount)}</span>
                        </div>
                    )}

                    <div className="flex w-full flex-row justify-between font-medium text-green-600">
                        <span>Total Savings</span>
                        <span>{formatMoney(calculations.totalSavings)}</span>
                    </div>
                </>
            )}

            {/* Total After Discounts */}
            <div className="flex w-full flex-row justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-lg">{formatMoney(calculations.finalTotal)}</span>
            </div>

            {/* Amount Input */}
            <div className="flex w-full flex-row justify-between gap-6">
                <span className="flex-row py-4">Amount Paid</span>
                <span className="flex-grow">
                    <input
                        type="text"
                        id="cart-payment"
                        placeholder={value}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-14 w-full border border-gray-300 rounded px-3 text-right text-xl bg-transparent"
                    />
                </span>
            </div>

            {/* Balance */}
            <div className="flex w-full flex-row justify-between">
                <span>Balance</span>
                <span className={`font-semibold ${balance > 0 ? "text-red-700" : "text-green-800"}`}>
                    {formatMoney(balance)}
                </span>
            </div>
        </div>
    );
};