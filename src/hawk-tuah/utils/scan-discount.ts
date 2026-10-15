// Pure helpers for pricing a scanned item. Kept free of React and IndexedDB so
// they can be unit tested (tests/scan-discount.test.cjs).

import type { DiscountRule, EnhancedPriceList } from "../types/discount-types";

/**
 * The single-item endpoint filters by name, which can match more than the
 * scanned code. Only an exact stock_id match is the scanned item.
 */
export function pickScannedItem(
  items: EnhancedPriceList[] | null | undefined,
  stock_id: string,
): EnhancedPriceList | undefined {
  if (!Array.isArray(items)) return undefined;
  const code = stock_id.trim().toUpperCase();
  return items.find((item) => String(item.stock_id).trim().toUpperCase() === code);
}

/**
 * Returns the item priced with whichever of its own discount or the given
 * rule is larger. Never lowers an existing discount.
 */
export function applyBetterRule(
  item: EnhancedPriceList,
  rule: DiscountRule | null | undefined,
): EnhancedPriceList {
  if (!rule || !(rule.discount_percent > (item.discount_percent || 0))) return item;
  const price = parseFloat(item.price);
  return {
    ...item,
    discount_percent: rule.discount_percent,
    discounted_price: price * (1 - rule.discount_percent / 100),
    has_discount: true,
    discount_details: {
      discount_id: rule.id,
      discount_type: rule.discount_type,
      discount_percent: rule.discount_percent,
      discount_amount: price * (rule.discount_percent / 100),
      lower_limit: rule.lower_limit,
      upper_limit: rule.upper_limit,
    },
  };
}
