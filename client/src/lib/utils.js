import { cn } from "cn";

export { cn };

/**
 * Calculate the actual customer-facing price.
 *
 * Uses finalPrice when the backend provides it.
 * Otherwise calculates the discount locally.
 */
export function getFinalPrice(product) {
  if (!product) {
    return 0;
  }

  const basePrice =
    Number(product.price);

  if (
    !Number.isFinite(basePrice) ||
    basePrice < 0
  ) {
    return 0;
  }

  /*
   * Prefer the backend-calculated finalPrice.
   */
  if (
    product.finalPrice !== undefined &&
    product.finalPrice !== null
  ) {
    const finalPrice =
      Number(product.finalPrice);

    if (
      Number.isFinite(finalPrice) &&
      finalPrice >= 0
    ) {
      return finalPrice;
    }
  }

  let discount =
    Number(
      product.discountPercentage || 0
    );

  if (
    !Number.isFinite(discount) ||
    discount <= 0
  ) {
    return basePrice;
  }

  /*
   * Never allow a discount above 100%.
   */
  discount = Math.min(
    Math.max(discount, 0),
    100
  );

  const finalPrice =
    basePrice -
    (basePrice * discount) /
      100;

  return (
    Math.round(
      finalPrice * 100
    ) / 100
  );
}
