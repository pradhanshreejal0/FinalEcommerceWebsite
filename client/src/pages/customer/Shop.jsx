import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { Search } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { AdBanner } from "@/components/AdBanner";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || ""
  );
  const [minPriceInput, setMinPriceInput] = useState(
    () => searchParams.get("minPrice") || ""
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    () => searchParams.get("maxPrice") || ""
  );

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sidebarAds, setSidebarAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await api("/categories");
        if (!cancelled) setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };

    const loadSidebarAds = async () => {
      try {
        const data = await api("/ads");
        if (!cancelled) {
          setSidebarAds(
            data.filter((ad) => ad.position === "sidebar" && ad.isActive)
          );
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadCategories();
    loadSidebarAds();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (sort) params.set("sort", sort);

        params.set("page", "1");
        params.set("limit", "24");
        const data = await api(`/products?${params.toString()}`);
        if (!cancelled) setProducts(data.products || data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [search, category, minPrice, maxPrice, sort]);

  const applyFilters = (e) => {
    e?.preventDefault();
    const params = {};
    if (searchInput.trim()) params.search = searchInput.trim();
    if (category) params.category = category;
    if (minPriceInput) params.minPrice = minPriceInput;
    if (maxPriceInput) params.maxPrice = maxPriceInput;
    if (sort) params.sort = sort;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSearchParams({});
  };

  const parents = categories.filter((c) => !c.parentCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="space-y-6">
          {/* Filters */}
          <div className="space-y-4 rounded-xl border border-black/10 p-4">
            <h3 className="font-semibold">Filters</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search..."
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category || "all"}
                onValueChange={(val) => {
                  const params = Object.fromEntries(searchParams);
                  if (val === "all") delete params.category;
                  else params.category = val;
                  setSearchParams(params);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {parents.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Price</label>
              <Input
                type="number"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Price</label>
              <Input
                type="number"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                placeholder="Any"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select
                value={sort}
                onValueChange={(val) => {
                  const params = Object.fromEntries(searchParams);
                  params.sort = val;
                  setSearchParams(params);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>

          {/* ========== SIDEBAR ADS ========== */}
          {sidebarAds.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Sponsored
              </h3>
              <AdBanner ads={sidebarAds} variant="sidebar" />
            </div>
          )}
        </aside>

        {/* ========== PRODUCTS ========== */}
        <div>
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-xl border bg-muted"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border p-10 text-center">
              <h2 className="text-xl font-semibold">No products found</h2>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="group overflow-hidden rounded-xl border border-black/10 bg-background transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      {product.discountPercentage > 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-black text-white text-xs font-bold px-2 py-1 rounded">
                          {product.discountPercentage}% OFF
                        </div>
                      )}
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
                      <div className="mt-3">
                        <PriceTag product={product} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
