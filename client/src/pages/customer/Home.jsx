import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PriceTag } from "@/components/PriceTag";
import { AdBanner } from "@/components/AdBanner";
import {
  ChevronRight,
  Zap,
  TrendingUp,
  Tag,
} from "lucide-react";

export default function Home() {
  const [ads, setAds] = useState([]);
  const [products, setProducts] = useState([]);

  const [loadingAds, setLoadingAds] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAds = async () => {
      try {
        const data = await api("/ads");

        if (!cancelled) {
          const activeHomepageAds = Array.isArray(data)
            ? data.filter(
                (ad) =>
                  ad.position === "homepage" &&
                  ad.isActive
              )
            : [];

          setAds(activeHomepageAds);
        }
      } catch (err) {
        console.error("Failed to load ads:", err);

        if (!cancelled) {
          setAds([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAds(false);
        }
      }
    };

    const loadProducts = async () => {
      try {
        const data = await api("/products?limit=20");

        if (!cancelled) {
          const productList = Array.isArray(data)
            ? data
            : data?.products || [];

          setProducts(productList);
        }
      } catch (err) {
        console.error("Failed to load products:", err);

        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    loadAds();
    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Products with discounts, sorted by highest discount.
   */
  const dealProducts = [...products]
    .filter(
      (product) =>
        Number(product.discountPercentage || 0) > 0
    )
    .sort(
      (a, b) =>
        Number(b.discountPercentage || 0) -
        Number(a.discountPercentage || 0)
    )
    .slice(0, 8);

  /*
   * First 12 products for the Top Picks section.
   */
  const topProducts = products.slice(0, 12);

  /*
   * Safely get the first product image.
   */
  const getProductImage = (product) => {
    if (!product?.images?.length) {
      return null;
    }

    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    return firstImage?.url || null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* =========================================================
          HOMEPAGE ADS CAROUSEL
      ========================================================== */}
      {!loadingAds && ads.length > 0 && (
        <AdBanner
          ads={ads}
          variant="carousel"
        />
      )}

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">

        {/* =======================================================
            DEAL OF THE DAY
        ======================================================== */}
        {dealProducts.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-4.5 w-4.5" />
                </span>

                <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  Deal of the Day
                </h2>
              </div>

              <Link
                to="/products"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All

                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {dealProducts.map((product) => {
                const image = getProductImage(product);

                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                  >
                    {/* Discount badge */}
                    {Number(product.discountPercentage || 0) > 0 && (
                      <div className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                        {product.discountPercentage}% OFF
                      </div>
                    )}

                    {/* Product image */}
                    <div className="aspect-square overflow-hidden bg-muted">
                      {image ? (
                        <img
                          src={image}
                          alt={product.title || "Product"}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Product information */}
                    <div className="p-3">
                      <h3 className="min-h-10 line-clamp-2 text-sm font-medium text-foreground">
                        {product.title}
                      </h3>

                      <div className="mt-2">
                        <PriceTag product={product} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* =======================================================
            TOP PICKS
        ======================================================== */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4.5 w-4.5" />
              </span>

              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Top Picks For You
              </h2>
            </div>

            <Link
              to="/products"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All

              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Loading state */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-lg border border-border bg-muted"
                />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            /* Empty state */
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />

              <h3 className="text-lg font-semibold text-foreground">
                No products yet
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Products will appear here once vendors publish them.
              </p>
            </div>
          ) : (
            /* Products */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {topProducts.map((product) => {
                const image = getProductImage(product);

                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="group overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                  >
                    {/* Product image */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {/* Discount badge */}
                      {Number(product.discountPercentage || 0) > 0 && (
                        <div className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                          {product.discountPercentage}% OFF
                        </div>
                      )}

                      {image ? (
                        <img
                          src={image}
                          alt={product.title || "Product"}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Product information */}
                    <div className="p-3">
                      <h3 className="min-h-10 line-clamp-2 text-sm font-medium text-foreground">
                        {product.title}
                      </h3>

                      <div className="mt-2">
                        <PriceTag product={product} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* =======================================================
            CTA
        ======================================================== */}
        <section className="relative overflow-hidden rounded-xl bg-linear-to-br from-primary via-primary to-[color-mix(in_oklch,var(--primary),var(--chart-3)_50%)] p-8 text-center text-primary-foreground shadow-lg shadow-primary/20 md:p-12">
          <h2 className="mb-3 text-2xl font-bold md:text-3xl">
            Explore All Offers
          </h2>

          <p className="mx-auto mb-6 max-w-md text-primary-foreground/80">
            Discover thousands of products with the biggest
            discounts from trusted vendors.
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-background px-8 py-3 font-semibold text-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Shop Now

            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
