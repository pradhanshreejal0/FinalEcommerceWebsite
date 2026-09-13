// Works whether the backend sent the `finalPrice` virtual or not.
export function getFinalPrice(product) {
  if (!product) return 0;
  if (product.finalPrice !== undefined && product.finalPrice !== null) {
    return Number(product.finalPrice);
  }
  const discount = Number(product.discountPercentage) || 0;
  if (discount > 0) {
    return Math.round((product.price - (product.price * discount) / 100) * 100) / 100;
  }
  return Number(product.price) || 0;
}