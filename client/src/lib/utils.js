import { cn } from "cn";

export { cn };

/**
 * Price the customer actually pays for a product.
 * Uses the backend's finalPrice when present, otherwise applies
 * discountPercentage (capped at 100%) to the base price.
 */
export function getFinalPrice(product) {
  const base = Number(product?.price);
  if (!Number.isFinite(base) || base < 0) return 0;

  if (product.finalPrice != null) {
    const final = Number(product.finalPrice);
    if (Number.isFinite(final) && final >= 0) return final;
  }

  const discount = Number(product.discountPercentage || 0);
  if (!Number.isFinite(discount) || discount <= 0) return base;

  return Math.round((base - (base * Math.min(discount, 100)) / 100) * 100) / 100;
}
