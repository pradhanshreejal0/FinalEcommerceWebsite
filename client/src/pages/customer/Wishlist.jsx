import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function Wishlist() {
  const { user, accessToken } = useAuth();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(accessToken && user?.role === "customer")
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken || user?.role !== "customer") {
      return;
    }

    let cancelled = false;

    const fetchWishlist = async () => {
      setLoading(true);
      try {
        const data = await api("/wishlist", { accessToken });
        if (!cancelled) {
          setWishlist(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load wishlist");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWishlist();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role]);

  const handleRemove = async (productId) => {
    try {
      const data = await api(`/wishlist/remove/${productId}`, {
        method: "DELETE",
        accessToken,
      });
      setWishlist(data);
    } catch (err) {
      setError(err.message || "Failed to remove");
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Please login to view your wishlist.</p>
        <Button asChild className="mt-4">
          <Link to="/login">Login</Link>
        </Button>
      </div>
    );
  }

  if (user.role !== "customer") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Wishlist is for customers only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground">Loading wishlist...</p>
      </div>
    );
  }

  const products = wishlist?.products || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Heart className="h-6 w-6" />
        My Wishlist
      </h1>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild className="mt-4">
            <Link to="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            if (!product?._id) return null;
            const image = product.images?.[0];

            return (
              <div
                key={product._id}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <Link to={`/products/${product._id}`}>
                  {image ? (
                    <img
                      src={image}
                      alt={product.title}
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-md bg-muted" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/products/${product._id}`}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {product.title}
                  </Link>
                  {product.vendor?.storeName && (
                    <p className="text-sm text-muted-foreground">
                      {product.vendor.storeName}
                    </p>
                  )}
                  <p className="mt-1 font-semibold">
                    RS {Number(product.price).toFixed(2)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleRemove(product._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
