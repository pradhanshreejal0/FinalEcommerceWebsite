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

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the source of truth for fetching
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "newest";

  // Local draft inputs (for typing before Apply)
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

    loadCategories();

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

        const data = await api(`/products?${params.toString()}`);
        if (!cancelled) setProducts(data);
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

  const updateCategory = (value) => {
    const params = Object.fromEntries(searchParams.entries());
    if (value) params.category = value;
    else delete params.category;
    setSearchParams(params);
  };

  const updateSort = (value) => {
    const params = Object.fromEntries(searchParams.entries());
    params.sort = value;
    setSearchParams(params);
  };

  const parents = categories.filter((c) => !c.parentCategory);
  const getChildren = (parentId) =>
    categories.filter((c) => {
      if (!c.parentCategory) return false;
      const pid = c.parentCategory._id || c.parentCategory;
      return String(pid) === String(parentId);
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Shop</h1>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <form onSubmit={applyFilters} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category || "all"}
                onValueChange={(v) => updateCategory(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {parents.map((parent) => (
                    <div key={parent._id}>
                      <SelectItem value={parent._id}>{parent.name}</SelectItem>
                      {getChildren(parent._id).map((child) => (
                        <SelectItem key={child._id} value={child._id}>
                          — {child.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min price</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max price</label>
              <Input
                type="number"
                min="0"
                placeholder="Any"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sort} onValueChange={updateSort}>
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

            <Button type="submit" className="w-full">
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </form>
        </aside>

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
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try different filters or search terms.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}