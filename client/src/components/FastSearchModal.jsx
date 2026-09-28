import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Tag,
  Package,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getFinalPrice } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// const POPULAR_SUGGESTIONS = [
//   "Headphones",
//   "Watch",
//   "Bag",
//   "Shoes",
//   "Laptop",
//   "Sunglasses",
// ];

const RECENT_KEY = "project_recent_searches";
const MIN_QUERY_LENGTH = 2;

/**
 * Aura Luxe–style full search modal adapted for this marketplace.
 * - Recent searches (localStorage)
 * - Popular suggestions
 * - Category quick links
 * - Keyboard navigation (↑↓ + Enter + Esc)
 * - API-backed live results with rich product cards
 */
export default function FastSearchModal({
  isOpen,
  onClose,
  categories = [],
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debouncedQuery = useDebouncedValue(query, 280);

  // Focus + reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setResults([]);
      setTotal(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Live API search
  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await api(
          `/products/suggest?q=${encodeURIComponent(term)}`
        );
        if (!cancelled) {
          setResults(data.results || []);
          setTotal(data.total || 0);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const saveRecent = useCallback((term) => {
    if (!term?.trim()) return;
    setRecentSearches((prev) => {
      const updated = [
        term.trim(),
        ...prev.filter((s) => s.toLowerCase() !== term.trim().toLowerCase()),
      ].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const goToProduct = (productId, name) => {
    if (name) saveRecent(name);
    onClose();
    navigate(`/products/${productId}`);
  };

  const goToFullResults = (term) => {
    if (term) saveRecent(term);
    onClose();
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : "/products");
  };

  const goToCategory = (categoryId) => {
    onClose();
    navigate(`/products?category=${categoryId}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length ? (prev < results.length - 1 ? prev + 1 : 0) : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length ? (prev > 0 ? prev - 1 : results.length - 1) : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        const p = results[selectedIndex];
        goToProduct(p._id, p.title);
      } else if (query.trim()) {
        goToFullResults(query.trim());
      }
    }
  };

  if (!isOpen) return null;

  const trimmed = query.trim();
  const showEmptyState = trimmed.length < MIN_QUERY_LENGTH;
  const hasResults = results.length > 0;
  const hasMore = total > results.length;

  const getImage = (product) => {
    if (!product?.images?.length) return null;
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || null;
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-background/80 px-3 pt-14 backdrop-blur-sm animate-in fade-in duration-150 sm:pt-20 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search catalog"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input bar */}
        <div className="relative flex items-center border-b px-4 py-3.5">
          <Search className="mr-3 h-5 w-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands, categories..."
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
            aria-autocomplete="list"
            aria-controls="fast-search-results"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mr-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="mr-2 hidden rounded border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div
          ref={listRef}
          id="fast-search-results"
          className="max-h-[58vh] flex-1 space-y-4 overflow-y-auto p-4"
          role="region"
          aria-live="polite"
        >
          {showEmptyState ? (
            <div className="space-y-5">
              {recentSearches.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Recent searches
                    </span>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="capitalize text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition hover:bg-muted/80"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Popular
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SUGGESTIONS.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        inputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                    >
                      <Tag className="h-3 w-3" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>*/}

              {categories.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Browse by category
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.slice(0, 6).map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => goToCategory(cat._id)}
                        className="group rounded-xl border bg-muted/30 p-3 text-left transition hover:bg-muted"
                      >
                        <span className="text-xs font-semibold transition-colors group-hover:text-primary">
                          {cat.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Explore →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : hasResults ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 pb-1 text-xs text-muted-foreground">
                <span>
                  Found <strong className="text-foreground">{total}</strong>{" "}
                  matching item{total === 1 ? "" : "s"}
                </span>
                <span className="text-[11px]">Use ↑↓ to navigate</span>
              </div>

              {results.map((product, idx) => {
                const isSelected = idx === selectedIndex;
                const image = getImage(product);
                const price = getFinalPrice(product);

                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => goToProduct(product._id, product.title)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {image ? (
                        <img
                          src={image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {product.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold">
                          RS {price.toFixed(0)}
                        </span>
                        {product.discountPercentage > 0 && (
                          <span className="text-xs text-muted-foreground line-through">
                            RS {Number(product.price).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected
                          ? "translate-x-1 text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => goToFullResults(trimmed)}
                  className="mt-2 block w-full rounded-xl border border-dashed py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50"
                >
                  See all {total} results for “{trimmed}”
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold">
                No items matching “{trimmed}”
              </h4>
              <p className="mx-auto mt-1 mb-4 max-w-sm text-xs text-muted-foreground">
                Try broader keywords or browse categories from the empty state.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span>⚡ Instant search</span>
          <span>Enter to select · Esc to close</span>
        </div>
      </div>
    </div>
  );
}
