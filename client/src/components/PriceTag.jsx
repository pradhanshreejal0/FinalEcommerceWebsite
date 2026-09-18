import { cn, getFinalPrice } from "@/lib/utils";

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
            RS{Number(product.price).toFixed(2)}
          </span>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
            {discount}% OFF
          </span>
        </>
      )}
    </div>
  );
}
