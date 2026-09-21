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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { Search, SlidersHorizontal } from "lucide-react";
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

  const [filterOpen, setFilterOpen] = useState(false);

  // =========================
  // LOAD CATEGORIES + ADS
  // =========================
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await api("/categories");

        if (!cancelled) {
          setCategories(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const loadSidebarAds = async () => {
      try {
        const data = await api("/ads");

        if (!cancelled) {
          setSidebarAds(
            data.filter(
              (ad) => ad.position === "sidebar" && ad.isActive
            )
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

  // =========================
  // LOAD PRODUCTS
  // =========================
  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (search) {
          params.set("search", search);
        }

        if (category) {
          params.set("category", category);
        }

        if (minPrice) {
          params.set("minPrice", minPrice);
        }

        if (maxPrice) {
          params.set("maxPrice", maxPrice);
        }

        if (sort) {
          params.set("sort", sort);
        }

        params.set("page", "1");
        params.set("limit", "24");

        const data = await api(`/products?${params.toString()}`);

        if (!cancelled) {
          setProducts(data.products || data);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [search, category, minPrice, maxPrice, sort]);

  // =========================
  // APPLY FILTERS
  // =========================
  const applyFilters = (e) => {
    e?.preventDefault();

    const params = {};

    if (searchInput.trim()) {
      params.search = searchInput.trim();
    }

    if (category) {
      params.category = category;
    }

    if (minPriceInput) {
      params.minPrice = minPriceInput;
    }

    if (maxPriceInput) {
      params.maxPrice = maxPriceInput;
    }

    if (sort) {
      params.sort = sort;
    }

    setSearchParams(params);

    // Close mobile drawer after applying
    setFilterOpen(false);
  };

  // =========================
  // CLEAR FILTERS
  // =========================
  const clearFilters = () => {
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSearchParams({});

    // Close mobile drawer
    setFilterOpen(false);
  };

  // =========================
  // CATEGORY LIST
  // =========================
  const parents = categories.filter((c) => !c.parentCategory);

  // =========================
  // FILTER CONTENT
  // =========================
  const filterContent = (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Search
        </label>

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

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category
        </label>

        <Select
          value={category || "all"}
          onValueChange={(val) => {
            const params = Object.fromEntries(searchParams);

            if (val === "all") {
              delete params.category;
            } else {
              params.category = val;
            }

            setSearchParams(params);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All categories
            </SelectItem>

            {parents.map((cat) => (
              <SelectItem
                key={cat._id}
                value={cat._id}
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min Price */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Min Price
        </label>

        <Input
          type="number"
          value={minPriceInput}
          onChange={(e) =>
            setMinPriceInput(e.target.value)
          }
          placeholder="0"
        />
      </div>

      {/* Max Price */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Max Price
        </label>

        <Input
          type="number"
          value={maxPriceInput}
          onChange={(e) =>
            setMaxPriceInput(e.target.value)
          }
          placeholder="Any"
        />
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Sort by
        </label>

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
            <SelectItem value="newest">
              Newest
            </SelectItem>

            <SelectItem value="price_asc">
              Price: Low to High
            </SelectItem>

            <SelectItem value="price_desc">
              Price: High to Low
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={applyFilters}
          className="flex-1"
        >
          Apply
        </Button>

        <Button
          variant="outline"
          onClick={clearFilters}
        >
          Clear
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      {/* =====================================
          MOBILE STICKY TOP BAR
      ====================================== */}
      <div className="sticky top-0 z-40 -mx-4 mb-5 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 lg:hidden">
        <div>
          <h1 className="text-xl font-semibold">
            Shop
          </h1>

          {!loading && (
            <p className="text-sm text-muted-foreground">
              {products.length}{" "}
              {products.length === 1
                ? "product"
                : "products"}
            </p>
          )}
        </div>

        <Sheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
        >
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-[85%] overflow-y-auto sm:max-w-md"
          >
            <SheetHeader className="mb-6">
              <SheetTitle>
                Filters
              </SheetTitle>
            </SheetHeader>

            {filterContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* =====================================
          MAIN LAYOUT
      ====================================== */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* =====================================
            DESKTOP SIDEBAR
        ====================================== */}
        <aside className="hidden space-y-6 lg:block">
          {/* Filters */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold">
              Filters
            </h3>

            {filterContent}
          </div>

          {/* Sidebar Ads */}
          {sidebarAds.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsored
              </h3>

              <AdBanner
                ads={sidebarAds}
                variant="sidebar"
              />
            </div>
          )}
        </aside>

        {/* =====================================
            PRODUCTS
        ====================================== */}
        <div>
          {loading ? (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl border bg-muted sm:h-80"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border p-10 text-center">
              <h2 className="text-xl font-semibold">
                No products found
              </h2>

              <p className="mt-2 text-muted-foreground">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {products.map((product) => {
                const image =
                  product.images?.length > 0
                    ? typeof product.images[0] ===
                      "string"
                      ? product.images[0]
                      : product.images[0]?.url
                    : null;

                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {product.discountPercentage >
                        0 && (
                        <div className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-sm sm:text-xs">
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
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground sm:text-sm">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Product Information */}
                    <div className="p-3 sm:p-4">
                      <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">
                        {product.title}
                      </h2>

                      {product.vendor?.storeName && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                          {product.vendor.storeName}
                        </p>
                      )}

                      <div className="mt-2 sm:mt-3">
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

      {/* =====================================
          MOBILE SPONSORED ADS
      ====================================== */}
      {sidebarAds.length > 0 && (
        <div className="mt-8 lg:hidden">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sponsored
          </h3>

          <AdBanner
            ads={sidebarAds}
            variant="sidebar"
          />
        </div>
      )}
    </div>
  );
}
