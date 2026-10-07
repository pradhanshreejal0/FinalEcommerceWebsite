import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import FastSearchModal from "@/components/FastSearchModal";
import { api } from "@/lib/api";

// Cache for categories to avoid redundant API calls
let categoriesCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search trigger that opens the Aura-style FastSearchModal.
 * Desktop: looks like an input field; click / focus opens the modal.
 * Mobile: full-width trigger + optional open button.
 * Global Cmd/Ctrl+K also opens the same modal (handled here once per instance).
 */
export default function SearchBox({ variant = "desktop", onNavigate }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(categoriesCache || []);

  useEffect(() => {
    let cancelled = false;

    // Use cached categories if available and not expired
    const now = Date.now();
    if (categoriesCache && now - cacheTime < CACHE_DURATION) {
      setCategories(categoriesCache);
    } else {
      (async () => {
        try {
          const data = await api("/categories");
          if (!cancelled && Array.isArray(data)) {
            categoriesCache = data;
            cacheTime = now;
            setCategories(data);
          }
        } catch {
          /* categories optional for search empty state */
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Cmd/Ctrl + K opens search (only register once if multiple SearchBoxes exist)
  useEffect(() => {
    if (variant !== "desktop") return;

    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  const handleClose = () => {
    setOpen(false);
    onNavigate?.();
  };

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-muted/50"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1">Search products...</span>
        </button>
        <Button
          type="button"
          className="mt-2 w-full rounded-lg"
          onClick={() => setOpen(true)}
        >
          Search
        </Button>
        <FastSearchModal
          isOpen={open}
          onClose={handleClose}
          categories={categories}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center rounded-lg bg-muted/50 px-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-11 sm:px-4"
        aria-label="Open search"
      >
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground sm:mr-3" />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          Search for products, brands and more
        </span>
        <kbd className="ml-2 hidden shrink-0 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>
      <FastSearchModal
        isOpen={open}
        onClose={handleClose}
        categories={categories}
      />
    </>
  );
}
