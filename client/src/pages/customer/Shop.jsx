import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, LayoutGrid, Package, X } from "lucide-react";
import { api } from "@/lib/api";
import { PriceTag } from "@/components/PriceTag";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get("category") || "";
  const qParam = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(qParam);

  useEffect(() => {
    setSearch(qParam);
  }, [qParam]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (categoryId) params.set("category", categoryId);
        if (qParam) params.set("search", qParam);
        params.set("limit", "48");

        const [productsRes, categoriesRes] = await Promise.all([
          api(`/products?${params.toString()}`),
          api("/categories"),
        ]);

        if (cancelled) return;

        const list = Array.isArray(productsRes)
          ? productsRes
          : productsRes?.products || [];
        setProducts(list);

        let cats = [];
        if (Array.isArray(categoriesRes)) cats = categoriesRes;
        else if (Array.isArray(categoriesRes?.data)) cats = categoriesRes.data;
        else if (Array.isArray(categoriesRes?.categories))
          cats = categoriesRes.categories;
        setCategories(cats);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load products");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [categoryId, qParam]);

  const getParentId = (c) => {
    if (!c?.parentCategory) return null;
    return typeof c.parentCategory === "object"
      ? c.parentCategory?._id
      : c.parentCategory;
  };

  const parents = useMemo(
    () => categories.filter((c) => !getParentId(c)),
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c._id) === String(categoryId)),
    [categories, categoryId]
  );

  const applySearch = (e) => {
    e?.preventDefault?.();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set("q", search.trim());
    else next.delete("q");
    setSearchParams(next);
  };

  const selectCategory = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("category", id);
    else next.delete("category");
    setSearchParams(next);
  };

  const getImage = (product) => {
    if (!product?.images?.length) return null;
    const first = product.images[0];
    return typeof first === "string" ? first : first?.url || null;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedCategory ? selectedCategory.name : "All Products"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${products.length} product${products.length === 1 ? "" : "s"}`}
            {selectedCategory ? ` in ${selectedCategory.name}` : ""}
            {qParam ? ` matching “${qParam}”` : ""}
          </p>
        </div>

        <form onSubmit={applySearch} className="flex w-full gap-2 sm:w-auto sm:min-w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Category chips */}
      {parents.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={!categoryId ? "default" : "outline"}
            onClick={() => selectCategory("")}
            className="gap-1"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            All
          </Button>
          {parents.map((cat) => (
            <Button
              key={cat._id}
              type="button"
              size="sm"
              variant={
                String(categoryId) === String(cat._id) ? "default" : "outline"
              }
              onClick={() => selectCategory(String(cat._id))}
              className="gap-1.5"
            >
              <CategoryIcon category={cat} size="sm" className="h-5! w-5!" />
              {cat.name}
            </Button>
          ))}
          {/* Subcategories of selected parent */}
          {categoryId &&
            categories
              .filter((c) => String(getParentId(c)) === String(categoryId))
              .map((sub) => (
                <Button
                  key={sub._id}
                  type="button"
                  size="sm"
                  variant={
                    String(categoryId) === String(sub._id) ? "default" : "secondary"
                  }
                  onClick={() => selectCategory(String(sub._id))}
                >
                  {sub.name}
                </Button>
              ))}
          {(categoryId || qParam) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchParams({});
                setSearch("");
              }}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {selectedCategory && (
        <div className="mb-4">
          <Badge variant="secondary" className="gap-1">
            Category: {selectedCategory.name}
            <button
              type="button"
              className="ml-1 rounded-full hover:bg-muted"
              onClick={() => selectCategory("")}
              aria-label="Clear category"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-50 items-center justify-center text-muted-foreground">
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another category or search term.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/products">View all products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const image = getImage(product);
            return (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              >
                {Number(product.discountPercentage || 0) > 0 && (
                  <div className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                    {product.discountPercentage}% OFF
                  </div>
                )}
                <div className="aspect-square overflow-hidden bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt={product.title || "Product"}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
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
    </main>
  );
}
