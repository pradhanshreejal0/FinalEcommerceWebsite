import { cn } from "@/lib/utils";

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

export function PriceTag({ product, size = "default", className }) {
  const discount = Number(product?.discountPercentage) || 0;
  const finalPrice = getFinalPrice(product);
  const hasDiscount = discount > 0;

  const priceClass = size === "lg" ? "text-3xl font-bold" : "text-lg font-bold";
  const originalClass =
    size === "lg" ? "text-lg text-muted-foreground" : "text-sm text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={priceClass}>${finalPrice.toFixed(2)}</span>
      {hasDiscount && (
        <>
          <span className={cn(originalClass, "line-through")}>
            ${Number(product.price).toFixed(2)}
          </span>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
            {discount}% OFF
          </span>
        </>
      )}
    </div>
  );
}