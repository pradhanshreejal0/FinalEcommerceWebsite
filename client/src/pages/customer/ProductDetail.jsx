import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { ProductReviews } from "@/components/ProductReviews";
import { PriceTag } from "@/components/PriceTag";
import { cn, getFinalPrice } from "@/lib/utils";
import { Heart, MessageCircle, Sparkles, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function ProductCard({ product }) {
  const image =
    product?.images?.[0] &&
    (typeof product.images[0] === "string"
      ? product.images[0]
      : product.images[0]?.url);

  const price = getFinalPrice(product);

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-background transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
          {product.title}
        </p>
        <div className="mt-auto flex items-center gap-2">
          <span className="text-sm font-bold">RS {Number(price).toFixed(0)}</span>
          {product.discountPercentage > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              RS {Number(product.price).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user, accessToken } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const [message, setMessage] = useState("");
  const [wishlistMsg, setWishlistMsg] = useState("");

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [activeDescTab, setActiveDescTab] = useState(0);
  const [openAccordion, setOpenAccordion] = useState(0);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setRelatedProducts([]);
        setRecommendedProducts([]);

        const data = await api(`/products/${id}`);

        if (!cancelled) {
          setProduct(data);
          setSelectedVariantKey("");
          setActiveImage(0);
          setActiveDescTab(0);
          setOpenAccordion(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load product");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Related (same category) + Recommended (popular / other) products
  useEffect(() => {
    if (!product?._id) return;

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const categoryId =
          typeof product.category === "string"
            ? product.category
            : product.category?._id;

        const [relatedRes, recommendedRes] = await Promise.all([
          categoryId
            ? api(`/products?category=${categoryId}&limit=8`).catch(() => null)
            : Promise.resolve(null),
          api(`/products?limit=8`).catch(() => null),
        ]);

        if (cancelled) return;

        const normalize = (data) =>
          Array.isArray(data) ? data : data?.products || [];

        const related = normalize(relatedRes)
          .filter((p) => String(p._id) !== String(product._id))
          .slice(0, 4);

        const relatedIds = new Set(related.map((p) => String(p._id)));

        const recommended = normalize(recommendedRes)
          .filter(
            (p) =>
              String(p._id) !== String(product._id) &&
              !relatedIds.has(String(p._id))
          )
          .slice(0, 4);

        setRelatedProducts(related);
        setRecommendedProducts(recommended);
      } catch (err) {
        console.error("Failed to load product suggestions:", err);
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [product]);

  useEffect(() => {
    let cancelled = false;

    const checkWishlist = async () => {
      if (!user || user.role !== "customer" || !accessToken || !id) {
        setIsWishlisted(false);
        return;
      }

      try {
        const data = await api("/wishlist", {
          accessToken,
        });

        if (cancelled) return;

        const wishlistItems = Array.isArray(data)
          ? data
          : data?.items || data?.wishlist || [];

        const exists = wishlistItems.some((item) => {
          const productId =
            typeof item.product === "string"
              ? item.product
              : item.product?._id;

          return String(productId) === String(id);
        });

        setIsWishlisted(exists);
      } catch (err) {
        console.error("Failed to check wishlist:", err);
        setIsWishlisted(false);
      }
    };

    checkWishlist();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      setMessage("Only customers can add products to cart.");
      return;
    }

    if (!product?._id) {
      setMessage("Product information is missing.");
      return;
    }

    if (
      product.hasVariants &&
      Array.isArray(product.variants) &&
      product.variants.length > 0 &&
      !selectedVariantKey
    ) {
      setMessage("Please select an option (size, color, etc.).");
      return;
    }

    setAdding(true);
    setMessage("");
    setWishlistMsg("");

    try {
      await addToCart(product._id, 1, selectedVariantKey || "");
      setMessage("Added to cart!");
    } catch (err) {
      setMessage(err.message || "Failed to add product to cart.");
    } finally {
      setAdding(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      setWishlistMsg("Only customers can use the wishlist.");
      return;
    }

    if (!product?._id) {
      setWishlistMsg("Product information is missing.");
      return;
    }

    if (wishlistLoading) return;

    setWishlistLoading(true);
    setWishlistMsg("");
    setMessage("");

    try {
      if (isWishlisted) {
        await api(`/wishlist/remove/${product._id}`, {
          method: "DELETE",
          accessToken,
        });

        setIsWishlisted(false);
        setWishlistMsg("Removed from wishlist.");
      } else {
        await api("/wishlist/add", {
          method: "POST",
          accessToken,
          body: JSON.stringify({
            productId: product._id,
          }),
        });

        setIsWishlisted(true);
        setWishlistMsg("Added to wishlist!");
      }
    } catch (err) {
      setWishlistMsg(
        err.message || "Failed to update wishlist."
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-muted" />

          <div className="space-y-5">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="h-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">
          Product not found
        </h1>

        <p className="mt-2 text-muted-foreground">
          {error || "This product is no longer available."}
        </p>

        <Link
          to="/"
          className="mt-6 inline-block underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const handleOpenChat = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can contact support.");
      return;
    }

    setChatError("");
    setChatText("");
    setChatOpen(true);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatText.trim() || chatSending) return;

    setChatSending(true);
    setChatError("");

    try {
      const chat = await api("/chats/start", {
        method: "POST",
        accessToken,
        body: {
          productId: product._id, // optional context
          message: chatText.trim(),
        },
      });

      setChatOpen(false);
      navigate(`/chats/${chat._id}`);
    } catch (err) {
      setChatError(err.message || "Failed to start chat");
    } finally {
      setChatSending(false);
    }
  };

  const images = (product.images || [])
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter(Boolean);

  const currentImage = images[activeImage] || images[0] || null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 md:grid-cols-2">

        {/* Product Images */}
        <div>
          {/* Main image */}
          <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border bg-muted sm:max-w-md">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.title}
                className="h-full w-full object-contain bg-card p-4"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mx-auto mt-3 flex max-w-sm gap-3 overflow-x-auto pb-1 sm:max-w-md">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${product.title}`}
                  aria-current={index === activeImage}
                  className={cn(
                    "h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-card transition",
                    index === activeImage
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div>

          {/* Category */}
          {product.category?.name && (
            <p className="text-sm text-muted-foreground">
              {product.category.name}
            </p>
          )}

          {/* Title */}
          <h1 className="mt-2 text-3xl font-bold">
            {product.title}
          </h1>

          {/* Ratings */}
          {product.ratings?.count > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={product.ratings.average} readOnly size={16} />
              <span className="text-sm text-muted-foreground">
                {product.ratings.average} ({product.ratings.count} review
                {product.ratings.count !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          {/* Vendor */}
          {/* {product.vendor?.storeName && (
            <p className="mt-2 text-muted-foreground">
              Sold by{" "}
              <span className="font-medium text-foreground">
                {product.vendor.storeName}
              </span>
            </p>
          )}*/}

          {/* Chat with us */}
          {(!user || user.role === "customer") && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-3 py-1 text-sm font-medium text-info-foreground transition hover:bg-info/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat with us
              </button>
            </div>
          )}

          {/* Price */}
          <div className="mt-6">
            {product.hasVariants &&
              Array.isArray(product.variants) &&
              product.variants.length > 0 && (
                <div className="space-y-4">
                  {(() => {
                    // Group attribute names (Size, Color, …) from all variants
                    const attrNames = [];
                    for (const v of product.variants) {
                      for (const a of v.attributes || []) {
                        const n = (a.name || "").trim();
                        if (n && !attrNames.includes(n)) attrNames.push(n);
                      }
                    }

                    const isColorAttr = (name) =>
                      /colou?r/i.test(name || "");

                    const colorToHex = (value) => {
                      const key = String(value || "")
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, "");
                      const map = {
                        red: "#ef4444",
                        blue: "#3b82f6",
                        green: "#22c55e",
                        yellow: "#eab308",
                        orange: "#f97316",
                        purple: "#a855f7",
                        pink: "#ec4899",
                        black: "#171717",
                        white: "#f5f5f5",
                        gray: "#9ca3af",
                        grey: "#9ca3af",
                        brown: "#92400e",
                        beige: "#d6c6a8",
                        navy: "#1e3a5f",
                        gold: "#ca8a04",
                        silver: "#c0c0c0",
                        maroon: "#7f1d1d",
                        teal: "#14b8a6",
                        cyan: "#06b6d4",
                        cream: "#fffdd0",
                        khaki: "#c3b091",
                        olive: "#808000",
                      };
                      if (map[key]) return map[key];
                      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
                      return null;
                    };

                    // Current selection map from selectedVariantKey
                    const selectedMap = {};
                    if (selectedVariantKey) {
                      const cur = product.variants.find(
                        (v) => v.key === selectedVariantKey
                      );
                      if (cur) {
                        for (const a of cur.attributes || []) {
                          if (a.name) selectedMap[a.name] = a.value;
                        }
                      }
                    }

                    const valuesFor = (name) => {
                      const set = new Set();
                      for (const v of product.variants) {
                        for (const a of v.attributes || []) {
                          if (a.name === name && a.value) set.add(a.value);
                        }
                      }
                      return [...set];
                    };

                    // Variant that matches selectedMap + optional override
                    const findMatch = (overrides = {}) => {
                      const want = { ...selectedMap, ...overrides };
                      return product.variants.find((v) => {
                        const attrs = v.attributes || [];
                        return attrNames.every((n) => {
                          if (want[n] == null || want[n] === "") return true;
                          return attrs.some(
                            (a) => a.name === n && a.value === want[n]
                          );
                        });
                      });
                    };

                    const pick = (name, value) => {
                      const next = { ...selectedMap, [name]: value };
                      // Prefer exact match with all attrs; else match this attr only
                      let match = product.variants.find((v) => {
                        const attrs = v.attributes || [];
                        return attrNames.every((n) => {
                          if (next[n] == null) return true;
                          return attrs.some(
                            (a) => a.name === n && a.value === next[n]
                          );
                        });
                      });
                      if (!match) {
                        match = product.variants.find((v) =>
                          (v.attributes || []).some(
                            (a) => a.name === name && a.value === value
                          )
                        );
                      }
                      if (match) setSelectedVariantKey(match.key);
                    };

                    const isValueAvailable = (name, value) => {
                      return product.variants.some((v) => {
                        if (Number(v.stock) < 1) return false;
                        const attrs = v.attributes || [];
                        if (
                          !attrs.some((a) => a.name === name && a.value === value)
                        )
                          return false;
                        // compatible with other selected attrs
                        return attrNames.every((n) => {
                          if (n === name) return true;
                          if (selectedMap[n] == null) return true;
                          return attrs.some(
                            (a) => a.name === n && a.value === selectedMap[n]
                          );
                        });
                      });
                    };

                    return attrNames.map((name) => {
                      const values = valuesFor(name);
                      const colorMode = isColorAttr(name);

                      return (
                        <div key={name} className="space-y-2">
                          <p className="text-sm font-medium">
                            {name}
                            {selectedMap[name] ? (
                              <span className="ml-2 font-normal text-muted-foreground">
                                {selectedMap[name]}
                              </span>
                            ) : null}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {values.map((value) => {
                              const selected = selectedMap[name] === value;
                              const available = isValueAvailable(name, value);
                              const hex = colorMode ? colorToHex(value) : null;

                              if (colorMode) {
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    title={value}
                                    disabled={!available}
                                    onClick={() => pick(name, value)}
                                    className={cn(
                                      "relative h-9 w-9 shrink-0 rounded-full border-2 transition",
                                      selected
                                        ? "border-primary ring-2 ring-primary/30 scale-105"
                                        : "border-border hover:border-primary/50",
                                      !available &&
                                        "opacity-40 cursor-not-allowed"
                                    )}
                                    style={{
                                      backgroundColor: hex || "#e5e5e5",
                                    }}
                                  >
                                    {!hex && (
                                      <span className="sr-only">{value}</span>
                                    )}
                                    {selected && (
                                      <span
                                        className={cn(
                                          "absolute inset-0 flex items-center justify-center text-xs font-bold",
                                          hex === "#f5f5f5" ||
                                            hex === "#fffdd0" ||
                                            hex === "#d6c6a8"
                                            ? "text-neutral-800"
                                            : "text-white"
                                        )}
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                );
                              }

                              // Size / other: compact value-only chips
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => pick(name, value)}
                                  className={cn(
                                    "min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                      : "border-border bg-background hover:border-primary/50",
                                    !available &&
                                      "opacity-40 cursor-not-allowed line-through"
                                  )}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

            <PriceTag
              product={
                selectedVariantKey && product.variants
                  ? {
                      ...product,
                      price:
                        product.variants.find((v) => v.key === selectedVariantKey)
                          ?.price ?? product.price,
                    }
                  : product
              }
              size="lg"
            />
          </div>

          {/* Description — layout chosen by vendor */}
          <div className="mt-6">
            {(() => {
              const sections =
                Array.isArray(product.descriptionSections) &&
                product.descriptionSections.length > 0
                  ? product.descriptionSections.filter(
                      (s) => (s.title && s.title.trim()) || (s.content && s.content.trim())
                    )
                  : product.description
                    ? [{ title: "", content: product.description }]
                    : [];

              if (sections.length === 0) {
                return (
                  <p className="leading-7 text-muted-foreground">
                    No description available.
                  </p>
                );
              }

              const style = product.descriptionStyle || "paragraphs";

              if (style === "cards") {
                return (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sections.map((s, i) => (
                      <div
                        key={i}
                        className="rounded-xl border bg-card p-4 shadow-sm"
                      >
                        {s.title?.trim() && (
                          <h3 className="mb-2 text-sm font-semibold tracking-tight">
                            {s.title}
                          </h3>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {s.content}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              }

              if (style === "tabs") {
                return (
                  <div>
                    <div className="mb-3 flex flex-wrap gap-1 border-b">
                      {sections.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveDescTab(i)}
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                            activeDescTab === i
                              ? "border-primary text-foreground"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {s.title?.trim() || `Section ${i + 1}`}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4">
                      {sections[activeDescTab]?.title?.trim() && (
                        <h3 className="mb-2 font-semibold">
                          {sections[activeDescTab].title}
                        </h3>
                      )}
                      <p className="whitespace-pre-wrap leading-7 text-muted-foreground">
                        {sections[activeDescTab]?.content}
                      </p>
                    </div>
                  </div>
                );
              }

              if (style === "accordion") {
                return (
                  <div className="divide-y rounded-xl border">
                    {sections.map((s, i) => {
                      const open = openAccordion === i;
                      return (
                        <div key={i}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAccordion(open ? -1 : i)
                            }
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
                          >
                            <span>
                              {s.title?.trim() || `Section ${i + 1}`}
                            </span>
                            <span className="text-muted-foreground">
                              {open ? "−" : "+"}
                            </span>
                          </button>
                          {open && (
                            <div className="px-4 pb-4">
                              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                {s.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (style === "list") {
                return (
                  <ol className="space-y-4">
                    {sections.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div>
                          {s.title?.trim() && (
                            <h3 className="mb-1 text-sm font-semibold">
                              {s.title}
                            </h3>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {s.content}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                );
              }

              // paragraphs (default)
              return (
                <div className="space-y-5">
                  {sections.map((s, i) => (
                    <div key={i}>
                      {s.title?.trim() && (
                        <h3 className="mb-1.5 text-base font-semibold tracking-tight">
                          {s.title}
                        </h3>
                      )}
                      <p className="whitespace-pre-wrap leading-7 text-muted-foreground">
                        {s.content}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">

            {/* Add to Cart */}
            <Button
              className="flex-1"
              size="lg"
              disabled={adding}
              onClick={handleAddToCart}
            >
              {adding ? "Adding..." : "Add to Cart"}
            </Button>

            {/* Wishlist */}
            <Button
              variant="outline"
              size="lg"
              disabled={wishlistLoading}
              onClick={handleAddToWishlist}
              aria-label={
                isWishlisted
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
            >
              <Heart
                className={
                  isWishlisted
                    ? "fill-destructive text-destructive"
                    : ""
                }
              />
            </Button>
          </div>

          {/* Cart message */}
          {message && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {message}
            </p>
          )}

          {/* Wishlist message */}
          {wishlistMsg && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {wishlistMsg}
            </p>
          )}
        </div>
      </div>

      <ProductReviews productId={product._id} />

      {/* Related products (same category) */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Related products
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recommended products */}
      {recommendedProducts.length > 0 && (
        <section className="mt-10 mb-4">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              Recommended for you
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {recommendedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Chat with us dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with us</DialogTitle>
            <DialogDescription>
              Send a message to our support team about{" "}
              <span className="font-medium text-foreground">
                {product.title}
              </span>
              . We'll reply here — you can find this conversation later
              under Messages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendChat} className="space-y-3">
            <Textarea
              autoFocus
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Write your message..."
              disabled={chatSending}
              maxLength={1000}
            />

            {chatError && (
              <p className="text-sm text-destructive">{chatError}</p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={chatSending || !chatText.trim()}
              >
                {chatSending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
