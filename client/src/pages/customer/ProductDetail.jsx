import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { ProductReviews } from "@/components/ProductReviews";
import { PriceTag } from "@/components/PriceTag";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle } from "lucide-react";

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

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api(`/products/${id}`);

        if (!cancelled) {
          setProduct(data);
          setActiveImage(0);
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

    setAdding(true);
    setMessage("");
    setWishlistMsg("");

    try {
      await addToCart(product._id, 1);
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

  const handleStartChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customers can contact support.");
      return;
    }

    const message = prompt("Write your message to support:");
    if (!message?.trim()) return;

    try {
      const chat = await api("/chats/start", {
        method: "POST",
        accessToken,
        body: {
          productId: product._id, // optional context
          message: message.trim(),
        },
      });

      navigate(`/chats/${chat._id}`);
    } catch (err) {
      alert(err.message || "Failed to start chat");
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
          <div className="overflow-hidden rounded-xl border bg-muted">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.title}
                className="aspect-square w-full object-contain bg-white p-4"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${product.title}`}
                  aria-current={index === activeImage}
                  className={cn(
                    "h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition",
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
          {product.vendor?.storeName && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground">
                Sold by{" "}
                <span className="font-medium text-foreground">
                  {product.vendor.storeName}
                </span>
              </p>

              {user && user.role === "customer" && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-600/30 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat with Support
                </button>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-6">
            <PriceTag product={product} size="lg" />
          </div>

          {/* Description */}
          <p className="mt-6 leading-7 text-muted-foreground">
            {product.description ||
              "No description available."}
          </p>

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
                    ? "fill-red-500 text-red-500"
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
    </main>
  );
}
