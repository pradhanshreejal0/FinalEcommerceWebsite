import { cn } from "cn";

export { cn };

/**
 * Price the customer actually pays for a product.
 * Uses the backend's finalPrice when present, otherwise applies
 * discountPercentage (capped at 100%) to the base price.
 *
 * For variants: pass the variant object directly (it has its own price).
 * The product's discountPercentage is already factored into variant prices
 * by the backend, so we should NOT apply it again.
 */
export function getFinalPrice(product) {
  const base = Number(product?.price);
  if (!Number.isFinite(base) || base < 0) return 0;

  if (product.finalPrice != null) {
    const final = Number(product.finalPrice);
    if (Number.isFinite(final) && final >= 0) return final;
  }

  // If this is a variant object (has key/attributes), its price is already final
  // The backend sets variant.price = basePrice (min of variants) and applies
  // discountPercentage at the product level. Variants don't have their own discount.
  // So we only apply discount if it's a base product (no variant key).
  const isVariant = product?.key || product?.attributes?.length > 0;
  const discount = isVariant ? 0 : Number(product.discountPercentage || 0);

  if (!Number.isFinite(discount) || discount <= 0) return base;

  return Math.round((base - (base * Math.min(discount, 100)) / 100) * 100) / 100;
}

/**
 * Get final price for a product with optional variant selection.
 * Use this when you have a base product and a selected variantKey.
 */
export function getProductPriceWithVariant(product, variantKey = "") {
  if (!product) return 0;

  const variantKeyStr = String(variantKey || "").trim();

  // If variant selected, find the variant and return its price (already final)
  if (variantKeyStr && product.hasVariants && Array.isArray(product.variants)) {
    const variant = product.variants.find((v) => v.key === variantKeyStr);
    if (variant) {
      return Number(variant.price) || 0;
    }
  }

  // Otherwise use base product price with discount
  return getFinalPrice(product);
}
