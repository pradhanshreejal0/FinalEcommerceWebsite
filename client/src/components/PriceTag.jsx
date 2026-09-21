import { cn, getFinalPrice } from "@/lib/utils";

export function PriceTag({ product, size = "default", className }) {
  const discount = Number(product?.discountPercentage) || 0;
  const finalPrice = getFinalPrice(product);
  const hasDiscount = discount > 0;

  const priceClass = size === "lg" ? "text-2xl font-bold" : "text-lg font-bold";
  const originalClass =
    size === "lg" ? "text-base text-muted-foreground" : "text-sm text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={priceClass}>RS {finalPrice.toFixed(0)}</span>
      {hasDiscount && (
        <>
          <span className={cn(originalClass, "line-through")}>
            RS {Number(product.price).toFixed(0)}
          </span>
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
            {discount}% OFF
          </span>
        </>
      )}
    </div>
  );
}
