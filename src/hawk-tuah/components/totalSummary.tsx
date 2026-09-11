/**
 * Enhanced Total Summary - Shows detailed discount breakdown
 * 
 * Replaces the existing TotalSummary with enhanced discount display
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import React from "react";
import { useCartStore } from "~/store/cart-store";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
// Progress component replacement (in case it doesn't exist)
const Progress = ({ value, className }: { value: number; className?: string }) => (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
        <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);
import {
    calculateEnhancedCartTotals,
    getBulkDiscountProgress
} from "../utils/discountCalculator";
import { formatMoney } from "../utils/formatters";

const EnhancedTotalSummary = () => {
    const { currentCart } = useCartStore();

    if (!currentCart || currentCart.items.length === 0) {
        return null;
    }

    const calculations = calculateEnhancedCartTotals(currentCart);
    console.log("Calculations:", calculations);
    const bulkProgress = getBulkDiscountProgress(calculations.subtotal - calculations.totalManualDiscounts - calculations.bulkDiscount.bulk_discount_amount);

    return (
        <div className="sticky bottom-0 left-0 right-0 mt-6 flex-col border-0 px-6 text-sm text-card-foreground">
            <ul className="grid gap-2 sm:justify-end md:items-end">

                {/* Item Discounts */}
                {calculations.totalItemDiscounts > 0 && (
                    <li className="flex flex-row items-center justify-between gap-8">
                        <span className="text-muted-foreground flex items-center gap-2">
                            Item Discounts
                            <Badge variant="secondary" className="text-xs">
                                Auto
                            </Badge>
                        </span>
                        <span className="text-right text-green-600">
                            -{formatMoney(calculations.totalItemDiscounts)}
                        </span>
                    </li>
                )}

                {/* Manual Discounts */}
                {calculations.totalManualDiscounts > 0 && (
                    <li className="flex flex-row items-center justify-between gap-8">
                        <span className="text-muted-foreground flex items-center gap-2">
                            Manual Discounts
                            <Badge variant="outline" className="text-xs">
                                Staff
                            </Badge>
                        </span>
                        <span className="text-right text-green-600">
                            -{formatMoney(calculations.totalManualDiscounts)}
                        </span>
                    </li>
                )}

                {/* Subtotal */}
                <li className="flex flex-row items-center justify-between gap-8">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-right">{formatMoney(calculations.subtotal)}</span>
                </li>

                {/* Bulk Discount */}
                {calculations.bulkDiscount.bulk_discount_amount > 0 && (
                    <li className="flex flex-row items-center justify-between gap-8">
                        <span className="text-muted-foreground flex items-center gap-2">
                            Bulk Discount
                            <Badge variant="default" className="text-xs">
                                {calculations.bulkDiscount.applicable_bulk_discount?.discount_percent}%
                            </Badge>
                        </span>
                        <span className="text-right text-green-600">
                            -{formatMoney(calculations.bulkDiscount.bulk_discount_amount)}
                        </span>
                    </li>
                )}

                {/* Bulk Discount Progress (if approaching next threshold) */}
                {bulkProgress.nextThreshold && bulkProgress.amountToNextDiscount <= 1000 && (
                    <li className="space-y-2">
                        <div className="flex flex-row items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">
                                Add {formatMoney(bulkProgress.amountToNextDiscount)} for {bulkProgress.nextThreshold.discount_percent}% bulk discount
                            </span>
                        </div>
                        <Progress value={bulkProgress.progressPercentage} className="h-1" />
                    </li>
                )}

                <Separator className="my-2" />

                {/* Total Savings */}
                {(calculations.totalItemDiscounts + calculations.totalManualDiscounts + calculations.bulkDiscount.bulk_discount_amount) > 0 && (
                    <li className="flex items-center justify-between font-medium text-green-600">
                        <span>Total Savings</span>
                        <span>
                            {formatMoney(calculations.totalItemDiscounts + calculations.totalManualDiscounts + calculations.bulkDiscount.bulk_discount_amount)}
                        </span>
                    </li>
                )}

                {/* Final Total */}
                <li className="flex items-center justify-between pb-1 font-semibold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-base">
                        {formatMoney(calculations.finalTotal)}
                    </span>
                </li>

                {/* Discount Breakdown (collapsible detail) */}
                {calculations.discountBreakdown.length > 0 && (
                    <li className="pt-2">
                        <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">
                                Discount Details ({calculations.discountBreakdown.length} applied)
                            </summary>
                            <div className="mt-2 space-y-1 pl-4">
                                {calculations.discountBreakdown.map((discount, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span>{discount.description}</span>
                                        <span>-{formatMoney(discount.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </li>
                )}
            </ul>
        </div>
    );
};

export default EnhancedTotalSummary;