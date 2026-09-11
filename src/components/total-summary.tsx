"use client";

import React from "react";
import { calculateCartTotal, calculateDiscount } from "~/lib/utils";
import { useCartStore } from "~/store/cart-store";
import { Separator } from "./ui/separator";
import EnhancedTotalSummary from "~/hawk-tuah/components/totalSummary";

const TotalSummary = () => {
  const { currentCart } = useCartStore();
  const total = calculateCartTotal(currentCart!);
  const discount = calculateDiscount(currentCart!);
  if (!total) return null;
  return (
    // <div className="sticky bottom-0 left-0 right-0 mt-6  flex-col  border-0   px-6 text-sm text-card-foreground  ">
    //   <ul className="grid gap-2 sm:justify-end md:items-end ">
    //     <li className="flex flex-row items-center justify-between gap-8">
    //       <span className="text-muted-foreground">Subtotal</span>
    //       <span className="text-right ">KSH {total ?? "0.00"}</span>
    //     </li>
    //     <li className="flex flex-row items-center justify-between gap-8">
    //       <span className="text-muted-foreground">Discount</span>
    //       <span className="text-right">KSH {discount ?? "0.00"}</span>
    //     </li>
    //     <Separator className="my-2" />
    //     <li className="flex items-center justify-between pb-1 font-semibold">
    //       <span className="text-muted-foreground">Total</span>

    //       <span className=" text-base ">KSH {total - discount}</span>
    //     </li>
    //   </ul>
    // </div>
    <EnhancedTotalSummary />
  );
};

export default TotalSummary;
