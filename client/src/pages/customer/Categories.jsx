
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

        console.log(
          "CLIENT CATEGORIES RESPONSE:",
          categoriesResponse
        );

        console.log(
          "CLIENT ADS RESPONSE:",
          adsResponse
        );

        /*
         * -------------------------------------------------------
         * NORMALIZE CATEGORY RESPONSE
         *
         * Supports:
         *
         * 1. [...]
         *
         * 2. { data: [...] }
         *
         * 3. { categories: [...] }
         * -------------------------------------------------------
         */

        let categoryList = [];

        if (Array.isArray(categoriesResponse)) {
          categoryList = categoriesResponse;
        } else if (
          Array.isArray(categoriesResponse?.data)
        ) {
          categoryList = categoriesResponse.data;
        } else if (
          Array.isArray(categoriesResponse?.categories)
        ) {
          categoryList = categoriesResponse.categories;
        }

        /*
         * -------------------------------------------------------
         * NORMALIZE ADS RESPONSE
         * -------------------------------------------------------
         */

        let adList = [];

        if (Array.isArray(adsResponse)) {
          adList = adsResponse;
        } else if (
          Array.isArray(adsResponse?.data)
        ) {
          adList = adsResponse.data;
        } else if (
          Array.isArray(adsResponse?.ads)
        ) {
          adList = adsResponse.ads;
        }

        if (!cancelled) {
          setCategories(categoryList);

          setCategoryAds(
            adList.filter(
              (ad) =>
                ad?.position === "category" &&
                ad?.isActive === true
            )
          );
        }
      } catch (err) {
        console.error(
          "Load client categories error:",
          err
        );

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
   * TOP LEVEL / PARENT CATEGORIES
   * ---------------------------------------------------------
   */

  const parents = categories.filter(
    (category) => {
      if (!category?.parentCategory) {
        return true;
      }

      /*
       * If parentCategory is an object,
       * check whether it contains an ID.
       */

      if (
        typeof category.parentCategory ===
        "object"
      ) {
        return !category.parentCategory?._id;
      }

      /*
       * If it contains an ID/string,
       * it is a subcategory.
       */

      return false;
    }
  );

  /*
   * ---------------------------------------------------------
   * GET CHILDREN
   * ---------------------------------------------------------
   */

  const getChildren = (parentId) => {
    return categories.filter((category) => {
      if (!category?.parentCategory) {
        return false;
      }

      const childParentId =
        typeof category.parentCategory ===
        "object"
          ? category.parentCategory?._id
          : category.parentCategory;

      return (
        String(childParentId) ===
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
        <div className="flex min-h-50 items-center justify-center">
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
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
          CATEGORY ADS
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
          HEADER
          ===================================================== */}

      <div className="mb-8">

        <h1 className="mb-2 text-3xl font-bold">
          Categories
        </h1>

        <p className="text-muted-foreground">
          Main categories and their
          subcategories
        </p>

      </div>

      {/* =====================================================
          NO CATEGORIES
          ===================================================== */}

      {categories.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">
            No categories available.
          </p>
        </div>
      ) : parents.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">
            No main categories available.
          </p>
        </div>
      ) : (

        /* ===================================================
           PARENT CATEGORY LIST
           =================================================== */

        <div className="space-y-8">

          {parents.map((parent) => {

            const children =
              getChildren(parent._id);

            return (
              <section
                key={parent._id}
                className="rounded-xl border border-black/10 p-6"
              >

                {/* ===========================================
                    PARENT HEADER
                    =========================================== */}

                <div className="flex flex-wrap items-center justify-between gap-4">

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

                {/* ===========================================
                    CHILDREN
                    =========================================== */}

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
