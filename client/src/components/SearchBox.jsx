import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getFinalPrice } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const MIN_QUERY_LENGTH = 2;

/**
 * Search input with a live "search as you type" dropdown. As the user
 * types, it shows up to 4 matching products; if there are more than 4
 * matches, a "See all N results" link is added so they can jump to the
 * full results page. Pressing Enter / tapping the search button still
 * goes straight to the full results page, same as before.
 */
export default function SearchBox({ variant = "desktop", onNavigate }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);

  const debouncedQuery = useDebouncedValue(query, 300);

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

    const loadSuggestions = async () => {
      try {
        const data = await api(
          `/products/suggest?q=${encodeURIComponent(term)}`
        );
        if (!cancelled) {
          setResults(data.results || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Search suggestions failed:", err);
        if (!cancelled) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToFullResults = (term) => {
    setOpen(false);
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : "/products");
    onNavigate?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToFullResults(query.trim());
  };

  const handleSelectProduct = (productId) => {
    setOpen(false);
    navigate(`/products/${productId}`);
    onNavigate?.();
  };

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH;
  const hasMore = total > results.length;

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <form onSubmit={handleSubmit}>
        <div
          className={
            variant === "mobile"
              ? "flex items-center rounded-lg border bg-muted/30 px-3"
              : "flex h-10 w-full items-center rounded-lg bg-muted/50 transition focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 sm:h-11"
          }
        >
          <Search
            className={
              variant === "mobile"
                ? "h-4 w-4 shrink-0 text-muted-foreground"
                : "ml-3 h-4 w-4 shrink-0 text-muted-foreground sm:ml-4"
            }
          />

          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              variant === "mobile"
                ? "Search products..."
                : "Search for products, brands and more"
            }
            className={
              variant === "mobile"
                ? "border-0 bg-transparent shadow-none focus-visible:ring-0"
                : "h-full min-w-0 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 sm:px-3"
            }
          />

          {variant === "desktop" && (
            <button
              type="submit"
              className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>

        {variant === "mobile" && (
          <Button type="submit" className="mt-2 w-full rounded-lg">
            Search
          </Button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No products found for &quot;{trimmedQuery}&quot;
            </div>
          ) : (
            <>
              <ul>
                {results.map((product) => {
                  const image =
                    product.images?.length > 0
                      ? typeof product.images[0] === "string"
                        ? product.images[0]
                        : product.images[0]?.url
                      : null;

                  return (
                    <li key={product._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(product._id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {image ? (
                            <img
                              src={image}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            RS {getFinalPrice(product).toFixed(0)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={() => goToFullResults(trimmedQuery)}
                  className="block w-full border-t px-3 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted"
                >
                  See all {total} results for &quot;{trimmedQuery}&quot;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
