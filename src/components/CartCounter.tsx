import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '~/store/cart-store';
import { Card, CardHeader } from './ui/card';
import { cn } from '~/lib/utils';

const CartCounter = () => {
    const currentCart = useCartStore((state) => state.currentCart);
    const uniqueItems = currentCart?.items.length || 0;
    const totalQuantity = currentCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
        <div className="w-full max-w-6xl py-2">
            <Card className={cn(
                "rounded-none",
                uniqueItems > 0 ? "hover:bg-accent focus:bg-accent" : "focus:bg-accent"
            )}>
                <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                        {/* Left side with icon and title */}
                        <div className="flex items-center gap-4">
                            <ShoppingCart className={cn(
                                "h-10 w-10",
                                uniqueItems > 0 ? "text-white" : "text-zinc-400"
                            )} />
                            <div className="space-y-1">
                                <h4 className="text-xl font-semibold">Cart Items</h4>
                                <p className="text-sm text-muted-foreground">
                                    {uniqueItems === 0 ? "No items in cart" : "Current cart status"}
                                </p>
                            </div>
                        </div>

                        {/* Right side with counters */}
                        <div className="flex items-center gap-8">
                            {/* Products counter */}
                            <div className="text-center">
                                <span className="block text-3xl font-bold">
                                    {uniqueItems}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">
                                    Products
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="h-12 w-px bg-zinc-200" />

                            {/* Total items counter */}
                            <div className="text-center">
                                <span className="block text-3xl font-bold">
                                    {totalQuantity}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">
                                    Total Items
                                </span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
};

export default CartCounter;