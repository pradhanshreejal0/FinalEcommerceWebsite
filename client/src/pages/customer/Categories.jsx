import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import { CategoryIcon } from "@/components/CategoryIcons";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryAds, setCategoryAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [cats, ads] = await Promise.all([
          api("/categories"),
          api("/ads"),
        ]);
        if (!cancelled) {
          setCategories(cats);
          setCategoryAds(
            ads.filter((ad) => ad.position === "category" && ad.isActive)
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const parents = categories.filter((c) => !c.parentCategory);

  const getChildren = (parentId) =>
    categories.filter((c) => {
      if (!c.parentCategory) return false;
      const pid = c.parentCategory._id || c.parentCategory;
      return String(pid) === String(parentId);
    });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Category Ads Banner */}
      {categoryAds.length > 0 && (
        <div className="mb-8">
          <AdBanner ads={categoryAds} variant="banner" />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2">Categories</h1>
      <p className="text-muted-foreground mb-8">
        Main categories and their subcategories
      </p>

      {parents.length === 0 ? (
        <p className="text-muted-foreground">No categories available.</p>
      ) : (
        <div className="space-y-8">
          {parents.map((parent) => {
            const children = getChildren(parent._id);

            return (
              <section
                key={parent._id}
                className="rounded-xl border border-black/10 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <CategoryIcon category={parent} size="md" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Main category
                      </p>
                      <h2 className="text-xl font-semibold mt-1">
                        {parent.name}
                      </h2>
                      {parent.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {parent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/products?category=${parent._id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    View all {parent.name} products →
                  </Link>
                </div>

                {children.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                      Subcategories
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {children.map((child) => (
                        <Link
                          key={child._id}
                          to={`/products?category=${child._id}`}
                          className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black hover:text-white transition"
                        >
                          <CategoryIcon category={child} size="sm" />
                          <span>{child.name}</span>
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
