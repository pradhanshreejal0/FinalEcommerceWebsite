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
    <div className="min-h-screen bg-white">
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
                <Zap className="h-5 w-5" />

                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  Deal of the Day
                </h2>
              </div>

              <Link
                to="/products"
                className="flex items-center gap-1 text-sm font-medium hover:underline"
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
                    className="group relative overflow-hidden rounded-lg border border-black/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Discount badge */}
                    {Number(product.discountPercentage || 0) > 0 && (
                      <div className="absolute left-2 top-2 z-10 rounded bg-black px-2 py-1 text-xs font-bold text-white">
                        {product.discountPercentage}% OFF
                      </div>
                    )}

                    {/* Product image */}
                    <div className="aspect-square overflow-hidden bg-gray-50">
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
                      <h3 className="min-h-10 line-clamp-2 text-sm font-medium">
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
              <TrendingUp className="h-5 w-5" />

              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                Top Picks For You
              </h2>
            </div>

            <Link
              to="/products"
              className="flex items-center gap-1 text-sm font-medium hover:underline"
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
                  className="h-72 animate-pulse rounded-lg border border-black/10 bg-muted"
                />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            /* Empty state */
            <div className="rounded-lg border border-black/20 p-12 text-center">
              <Tag className="mx-auto mb-3 h-10 w-10 opacity-40" />

              <h3 className="text-lg font-semibold">
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
                    className="group overflow-hidden rounded-lg border border-black/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Product image */}
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      {/* Discount badge */}
                      {Number(product.discountPercentage || 0) > 0 && (
                        <div className="absolute left-2 top-2 z-10 rounded bg-black px-2 py-0.5 text-[11px] font-bold text-white">
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
                      <h3 className="min-h-10 line-clamp-2 text-sm font-medium">
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
        <section className="rounded-xl border-2 border-black bg-black p-8 text-center text-white md:p-12">
          <h2 className="mb-3 text-2xl font-bold md:text-3xl">
            Explore All Offers
          </h2>

          <p className="mx-auto mb-6 max-w-md text-white/70">
            Discover thousands of products with the biggest
            discounts from trusted vendors.
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-semibold text-black transition hover:bg-gray-100"
          >
            Shop Now

            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
