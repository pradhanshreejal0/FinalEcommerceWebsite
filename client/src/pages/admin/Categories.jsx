import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import { CategoryIcon } from "@/components/CategoryIcon";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryAds, setCategoryAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [categoriesResponse, adsResponse] =
          await Promise.all([
            api("/categories"),
            api("/ads"),
          ]);

        /*
         * -------------------------------------------------------
         * NORMALIZE CATEGORIES RESPONSE
         *
         * Supports:
         *
         * [
         *   { ... }
         * ]
         *
         * {
         *   data: [...]
         * }
         *
         * {
         *   categories: [...]
         * }
         * -------------------------------------------------------
         */

        const categoryData =
          categoriesResponse?.data ??
          categoriesResponse?.categories ??
          categoriesResponse;

        const normalizedCategories = Array.isArray(categoryData)
          ? categoryData
          : [];

        /*
         * -------------------------------------------------------
         * NORMALIZE ADS RESPONSE
         * -------------------------------------------------------
         */

        const adData =
          adsResponse?.data ??
          adsResponse?.ads ??
          adsResponse;

        const normalizedAds = Array.isArray(adData)
          ? adData
          : [];

        if (!cancelled) {
          setCategories(normalizedCategories);

          setCategoryAds(
            normalizedAds.filter(
              (ad) =>
                ad?.position === "category" &&
                ad?.isActive
            )
          );
        }
      } catch (err) {
        console.error("Load categories error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load categories."
          );

          setCategories([]);
          setCategoryAds([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * GET TOP-LEVEL CATEGORIES
   * ---------------------------------------------------------
   *
   * A parent category has no parentCategory.
   *
   * Supports:
   *
   * parentCategory: null
   * parentCategory: undefined
   * parentCategory: ""
   * ---------------------------------------------------------
   */

  const parents = categories.filter(
    (category) => !category?.parentCategory
  );

  /*
   * ---------------------------------------------------------
   * GET CHILD CATEGORIES
   * ---------------------------------------------------------
   *
   * parentCategory can be either:
   *
   * "68abc..."
   *
   * or:
   *
   * {
   *   _id: "68abc...",
   *   name: "Electronics"
   * }
   * ---------------------------------------------------------
   */

  const getChildren = (parentId) => {
    return categories.filter((category) => {
      if (!category?.parentCategory) {
        return false;
      }

      const parentIdFromCategory =
        typeof category.parentCategory === "object"
          ? category.parentCategory?._id
          : category.parentCategory;

      return (
        String(parentIdFromCategory) ===
        String(parentId)
      );
    });
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex min-h-40 items-center justify-center">
          <p className="text-muted-foreground">
            Loading categories...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* =====================================================
          CATEGORY ADVERTISEMENT
          ===================================================== */}

      {categoryAds.length > 0 && (
        <div className="mb-8">
          <AdBanner
            ads={categoryAds}
            variant="banner"
          />
        </div>
      )}

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Categories
        </h1>

        <p className="mt-2 text-muted-foreground">
          Main categories and their subcategories
        </p>
      </div>

      {/* =====================================================
          NO CATEGORIES
          ===================================================== */}

      {categories.length === 0 ? (
        <div className="rounded-xl border p-10 text-center">
          <p className="text-muted-foreground">
            No categories available.
          </p>
        </div>
      ) : parents.length === 0 ? (
        /*
         * This catches a situation where categories exist,
         * but every category has a parentCategory.
         */
        <div className="rounded-xl border p-10 text-center">
          <p className="text-muted-foreground">
            No main categories available.
          </p>
        </div>
      ) : (
        /*
         * =====================================================
         * PARENT CATEGORIES
         * =====================================================
         */

        <div className="space-y-8">
          {parents.map((parent) => {
            const children = getChildren(parent._id);

            return (
              <section
                key={parent._id}
                className="rounded-xl border border-black/10 bg-background p-6"
              >

                {/* =============================================
                    PARENT HEADER
                    ============================================= */}

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-4">

                    <CategoryIcon
                      category={parent}
                      size="md"
                    />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Main category
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {parent.name}
                      </h2>

                      {parent.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {parent.description}
                        </p>
                      )}
                    </div>

                  </div>

                  <Link
                    to={`/products?category=${encodeURIComponent(
                      parent._id
                    )}`}
                    className="text-sm font-medium hover:underline"
                  >
                    View all {parent.name} products →
                  </Link>

                </div>

                {/* =============================================
                    SUBCATEGORIES
                    ============================================= */}

                {children.length > 0 ? (
                  <div className="mt-6">

                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Subcategories
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                      {children.map((child) => (
                        <Link
                          key={child._id}
                          to={`/products?category=${encodeURIComponent(
                            child._id
                          )}`}
                          className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium transition hover:bg-black hover:text-white"
                        >

                          <CategoryIcon
                            category={child}
                            size="sm"
                          />

                          <span>
                            {child.name}
                          </span>

                        </Link>
                      ))}

                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No subcategories yet.
                  </p>
                )}

              </section>
            );
          })}
        </div>
      )}

    </div>
  );
}
