import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PriceTag } from "@/components/PriceTag";
import { AdBanner } from "@/components/AdBanner";
import { ChevronRight, Zap, TrendingUp, Tag } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";

export default function Home() {
  const [ads, setAds] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAds = async () => {
      try {
        const data = await api("/ads");
        if (!cancelled) {
          // Only homepage + active
          setAds(
            data.filter((ad) => ad.position === "homepage" && ad.isActive)
          );
        }
      } catch (err) {
        console.error("Failed to load ads:", err);
      } finally {
        if (!cancelled) setLoadingAds(false);
      }
    };

    const loadProducts = async () => {
      try {
        const data = await api("/products?limit=20");
        if (!cancelled) setProducts(data.products || data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    const loadCategories = async () => {
      try {
        const data = await api("/categories");
        if (!cancelled)
          setCategories(data.filter((c) => !c.parentCategory).slice(0, 8));
      } catch (err) {
        console.error(err);
      }
    };

    loadAds();
    loadProducts();
    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const dealProducts = [...products]
    .filter((p) => (p.discountPercentage || 0) > 0)
    .sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0))
    .slice(0, 8);

  const topProducts = products.slice(0, 12);

  return (
    <div className="bg-white min-h-screen">
      {/* ========== HOMEPAGE ADS CAROUSEL ========== */}
      {!loadingAds && ads.length > 0 && <AdBanner ads={ads} variant="carousel" />}

      {/* ========== CATEGORY CIRCLES ========== */}
      {categories.length > 0 && (
        <section className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${cat._id}`}
                  className="flex flex-col items-center gap-2 min-w-20 group"
                >
                  <div className="group-hover:scale-105 transition-transform duration-300">
                    <CategoryIcon category={cat} size="md" />
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-1 max-w-20">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {/* DEAL OF THE DAY */}
        {dealProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  Deal of the Day
                </h2>
              </div>
              <Link
                to="/products"
                className="flex items-center gap-1 text-sm font-medium hover:underline"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {dealProducts.map((product) => {
                const image =
                  product.images?.length > 0
                    ? typeof product.images[0] === "string"
                      ? product.images[0]
                      : product.images[0]?.url
                    : null;

                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="group relative border border-black/10 rounded-lg overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {product.discountPercentage > 0 && (
                      <div className="absolute top-2 left-2 z-10 bg-black text-white text-xs font-bold px-2 py-1 rounded">
                        {product.discountPercentage}% OFF
                      </div>
                    )}
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {image ? (
                        <img
                          src={image}
                          alt={product.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium line-clamp-2 min-h-10">
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

        {/* TOP PICKS */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Top Picks For You
              </h2>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-1 text-sm font-medium hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-lg border border-black/10 bg-muted"
                />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-lg border border-black/20 p-12 text-center">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-semibold">No products yet</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                Products will appear here once vendors publish them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topProducts.map((product) => {
                const image =
                  product.images?.length > 0
                    ? typeof product.images[0] === "string"
                      ? product.images[0]
                      : product.images[0]?.url
                    : null;

                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="group border border-black/10 rounded-lg overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      {product.discountPercentage > 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-black text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          {product.discountPercentage}% OFF
                        </div>
                      )}
                      {image ? (
                        <img
                          src={image}
                          alt={product.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium line-clamp-2 min-h-10">
                        {product.title}
                      </h3>
                      {/* {product.vendor?.storeName && (
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {product.vendor.storeName}
                        </p>
                      )}*/}
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

        {/* CTA */}
        <section className="rounded-xl border-2 border-black bg-black text-white p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Explore All Offers
          </h2>
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            Discover thousands of products with the biggest discounts from
            trusted vendors.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition"
          >
            Shop Now <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
