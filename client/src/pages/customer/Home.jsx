import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { cloudinaryImage } from "@/lib/cloudinary";
import { PriceTag } from "@/components/PriceTag";
import { AdBanner } from "@/components/AdBanner";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ChevronRight, LayoutGrid, Sparkles, TrendingUp, Zap } from "lucide-react";

function getProductImage(product) {
  const image = product?.images?.[0];
  return typeof image === "string" ? image : image?.url || null;
}

function ProductRail({ title, icon: Icon, products, loading, href = "/products", badge }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h2>
        </div>
        <Link to={href} className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden" aria-label={`Loading ${title}`}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-64 w-44 shrink-0 animate-pulse rounded-lg bg-muted sm:w-56" />
          ))}
        </div>
      ) : products.length ? (
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {products.map((product) => {
            const image = getProductImage(product);
            return (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-56"
              >
                {badge?.(product) && (
                  <span className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                    {badge(product)}
                  </span>
                )}
                <div className="aspect-square overflow-hidden bg-muted">
                  {image ? (
                    <img
                      src={cloudinaryImage(image, { width: 400 })}
                      srcSet={`${cloudinaryImage(image, { width: 300 })} 300w, ${cloudinaryImage(image, { width: 400 })} 400w, ${cloudinaryImage(image, { width: 600 })} 600w`}
                      sizes="(max-width: 640px) 160px, 224px"
                      alt={product.title || "Product"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-foreground">{product.title}</h3>
                  <PriceTag product={product} className="mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Products will appear here as they become available.</p>
      )}
    </section>
  );
}

export default function Home() {
  const [ads, setAds] = useState([]);
  const [productsBySection, setProductsBySection] = useState({ newest: [], bestsellers: [], featured: [] });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Load independent homepage content together; each shelf requests its own server-side ranking.
    Promise.allSettled([
      api("/products?limit=12&compact=true&includeTotal=false&sort=newest"),
      api("/products?limit=12&compact=true&includeTotal=false&section=bestsellers"),
      api("/products?limit=12&compact=true&includeTotal=false&section=featured"),
      api("/categories"),
      api("/ads"),
    ]).then((results) => {
      if (cancelled) return;
      const list = (result) => {
        if (result.status !== "fulfilled") return [];
        const data = result.value;
        return Array.isArray(data) ? data : data?.products || data?.data || data?.categories || [];
      };
      setProductsBySection({ newest: list(results[0]), bestsellers: list(results[1]), featured: list(results[2]) });
      setCategories(list(results[3]));
      setAds(list(results[4]).filter((ad) => ad.position === "homepage" && ad.isActive));
      setLoading(false);
      setLoadingAds(false);
    });

    return () => { cancelled = true; };
  }, []);

  const parentCategories = categories.filter((category) => {
    if (!category?.parentCategory) return true;
    if (typeof category.parentCategory === "object") return !category.parentCategory?._id;
    return false;
  });
  const deals = productsBySection.newest
    .filter((product) => Number(product.discountPercentage || 0) > 0)
    .sort((a, b) => Number(b.discountPercentage || 0) - Number(a.discountPercentage || 0))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {!loadingAds && ads.length > 0 && <AdBanner ads={ads} variant="carousel" />}
      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        {parentCategories.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><LayoutGrid className="h-4 w-4" /></span>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Shop by category</h2>
            </div>
            <div className="scrollbar-hide flex snap-x gap-3 overflow-x-auto pb-2">
              {parentCategories.slice(0, 16).map((category) => (
                <Link key={category._id} to={`/products?category=${category._id}`} className="flex w-24 shrink-0 snap-start flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-28">
                  <CategoryIcon category={category} size="md" />
                  <span className="line-clamp-2 text-xs font-medium text-foreground">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ProductRail title="New arrivals" icon={Sparkles} products={productsBySection.newest} loading={loading} />
        <ProductRail title="Best sellers" icon={TrendingUp} products={productsBySection.bestsellers} loading={loading} />
        <ProductRail title="Customer favorites" icon={Zap} products={productsBySection.featured} loading={loading} />
        {deals.length > 0 && (
          <ProductRail title="Deals" icon={Zap} products={deals} loading={loading} badge={(product) => `${product.discountPercentage}% off`} />
        )}
      </main>
    </div>
  );
}
