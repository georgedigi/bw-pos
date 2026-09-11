/**
 * Enhanced Cart Columns - Shows discounts transparently
 * 
 * Replaces the existing cartColumns with enhanced discount display
 * 
 * @author Kennedy Ngugi
 * @date 15-06-2025
 * @version 1.0.0
 */

import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { getItemPricingInfo } from "../utils/discountCalculator";
import { Badge } from "~/components/ui/badge";

export const enhancedCartColumns: ColumnDef<DirectSales>[] = [
    {
        id: "description",
        accessorKey: "item.description",
        header: "Item Name",
        cell: ({ row }) => {
            const item = row.original;
            const pricingInfo = getItemPricingInfo(item);

            return (
                <div className="space-y-1">
                    <div className="font-medium">{item.item.description}</div>
                    {pricingInfo.hasAnyDiscount && (
                        <div className="flex gap-1">
                            {item.enhanced_item?.has_discount && (
                                <Badge variant="secondary" className="text-xs">
                                    {item.enhanced_item.discount_details?.discount_type} -{item.enhanced_item.discount_percent}%
                                </Badge>
                            )}
                            {parseFloat(item.discount || "0") > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    Manual Discount
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => {
            return <span className="font-medium">{row.original.quantity}</span>;
        }
    },
    {
        id: "pricing",
        header: "Price",
        cell: ({ row }) => {
            const item = row.original;
            const pricingInfo = getItemPricingInfo(item);

            if (!pricingInfo.hasAnyDiscount) {
                // No discount - show simple price
                return (
                    <div className="text-right">
                        <div className="font-medium">
                            {item.details.price.toFixed(2)}
                        </div>
                    </div>
                );
            }

            // Has discount - show original and discounted price
            return (
                <div className="text-right space-y-1">
                    {pricingInfo.automaticDiscount > 0 && (
                        <div className="text-xs text-muted-foreground line-through">
                            {pricingInfo.originalPrice.toFixed(2)}
                        </div>
                    )}
                    <div className="font-medium text-green-600">
                        {pricingInfo.currentPrice.toFixed(2)}
                    </div>
                    {pricingInfo.discountPercentage > 0 && (
                        <div className="text-xs text-green-600">
                            (-{pricingInfo.discountPercentage.toFixed(1)}%)
                        </div>
                    )}
                </div>
            );
        }
    },
    {
        id: "total",
        header: "Total",
        cell: ({ row }) => {
            const item = row.original;
            const pricingInfo = getItemPricingInfo(item);

            const originalTotal = pricingInfo.originalPrice * item.quantity;
            const currentTotal = item.quantity * item.details.price;
            const finalTotal = currentTotal - parseFloat(item.discount || "0");

            return (
                <div className="text-right space-y-1">
                    {pricingInfo.hasAnyDiscount && originalTotal !== finalTotal && (
                        <div className="text-xs text-muted-foreground line-through">
                            {originalTotal.toFixed(2)}
                        </div>
                    )}
                    <div className={`font-medium ${pricingInfo.hasAnyDiscount ? 'text-green-600' : ''}`}>
                        {finalTotal.toFixed(2)}
                    </div>
                    {pricingInfo.totalDiscount > 0 && (
                        <div className="text-xs text-green-600">
                            Saved: {pricingInfo.totalDiscount.toFixed(2)}
                        </div>
                    )}
                </div>
            );
        }
    }
];