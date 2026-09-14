import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PriceTag } from "@/components/PriceTag";

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
        const data = await api("/products?limit=12"); 
        if (!cancelled) setProducts(data.products || data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    loadAds();
    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Ads – full width, natural height */}
      {!loadingAds && ads.length > 0 && (
        <section className="w-full">
          {ads.map((ad) => (
            <div key={ad._id} className="relative w-full">
              {ad.link ? (
                <Link to={ad.link} className="block w-full">
                  <img
                    src={ad.image}
                    alt={ad.title}
                    className="w-full h-auto object-contain"
                  />
                </Link>
              ) : (
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-auto object-contain"
                />
              )}
              <div className="absolute bottom-4 left-4 rounded bg-black/60 px-4 py-2 text-white">
                {ad.title}
              </div>
            </div>
          ))}
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Discover Products
          </h1>
          <p className="mt-2 text-muted-foreground">
            Shop products from our trusted vendors.
          </p>
        </div>

        {loadingProducts ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-xl border bg-muted"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border p-10 text-center">
            <h2 className="text-xl font-semibold">No products available</h2>
            <p className="mt-2 text-muted-foreground">
              Products will appear here once vendors publish them.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
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
                  className="group overflow-hidden rounded-xl border bg-background transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {image ? (
                      <img
                        src={image}
                        alt={product.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="line-clamp-2 font-semibold">
                      {product.title}
                    </h2>

                    {product.vendor?.storeName && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.vendor.storeName}
                      </p>
                    )}

                    {product.category?.name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {product.category.name}
                      </p>
                    )}

                    <div className="mt-3">
                      <PriceTag product={product} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}