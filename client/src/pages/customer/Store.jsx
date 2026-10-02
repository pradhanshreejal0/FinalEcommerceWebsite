import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Package, Store as StoreIcon } from "lucide-react";
import { api } from "@/lib/api";
import { cloudinaryImage } from "@/lib/cloudinary";
import { PriceTag } from "@/components/PriceTag";

export default function Store() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api(`/vendors/store/${encodeURIComponent(slug)}`);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message || "Store not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading store…
      </div>
    );
  }

  if (error || !data?.vendor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <StoreIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Store not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Link to="/products" className="mt-6 inline-block text-primary hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  const { vendor, products } = data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        {vendor.banner ? (
          <img
            src={vendor.banner}
            alt=""
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <div className="h-32 bg-linear-to-r from-primary/20 to-primary/5 sm:h-40" />
        )}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
          <div className="-mt-12 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-md sm:-mt-14 sm:h-24 sm:w-24">
            {vendor.logo ? (
              <img src={vendor.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <StoreIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{vendor.storeName}</h1>
            {vendor.storeDescription && (
              <p className="mt-1 text-sm text-muted-foreground">
                {vendor.storeDescription}
              </p>
            )}
            {(vendor.location?.city || vendor.location?.address) && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[vendor.location.address, vendor.location.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-10 flex items-center gap-2 text-lg font-semibold">
        <Package className="h-5 w-5 text-primary" />
        Products ({products?.length || 0})
      </h2>

      {!products?.length ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <Link
              key={p._id}
              to={`/products/${p._id}`}
              className="group overflow-hidden rounded-xl border bg-background transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="aspect-square bg-muted">
                {p.images?.[0] ? (
                  <img
                    src={cloudinaryImage(p.images[0], { width: 400 })}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">
                  {p.title}
                </p>
                <div className="mt-1">
                  <PriceTag product={p} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
