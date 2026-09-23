
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getFinalPrice } from "@/lib/utils";

export default function Cart() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const {
    cart,
    loading,
    total,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const [updatingProduct, setUpdatingProduct] = useState(null);
  const [removingProduct, setRemovingProduct] = useState(null);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Authentication
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

          <h1 className="text-2xl font-bold">
            Please login
          </h1>

          <p className="mt-2 text-muted-foreground">
            Login to view your shopping cart.
          </p>

          <Button asChild className="mt-5">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Customer Only
  |--------------------------------------------------------------------------
  */

  if (user.role !== "customer") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Customer Cart
          </h1>

          <p className="mt-2 text-muted-foreground">
            Only customer accounts can use the shopping cart.
          </p>

          <Button
            className="mt-5"
            onClick={() => navigate("/")}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading cart...
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  /*
  |--------------------------------------------------------------------------
  | Empty Cart
  |--------------------------------------------------------------------------
  */

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-bold">
            Your cart is empty
          </h1>

          <p className="mt-2 text-muted-foreground">
            Looks like you haven't added anything to your cart yet.
          </p>

          <Button asChild className="mt-6">
            <Link to="/products">
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Group Items By Vendor
  |--------------------------------------------------------------------------
  */

  const byVendor = {};

  items.forEach((item) => {
    const vendorName =
      item.product?.vendor?.storeName ||
      "Unknown Vendor";

    if (!byVendor[vendorName]) {
      byVendor[vendorName] = [];
    }

    byVendor[vendorName].push(item);
  });

  /*
  |--------------------------------------------------------------------------
  | Quantity Update
  |--------------------------------------------------------------------------
  */

  const handleQuantityChange = async (
    productId,
    quantity
  ) => {
    if (quantity < 1) {
      return;
    }

    try {
      setError("");
      setUpdatingProduct(productId);

      await updateQuantity(productId, quantity);
    } catch (error) {
      console.error("Update quantity error:", error);

      setError(
        error?.message ||
          "Failed to update product quantity."
      );
    } finally {
      setUpdatingProduct(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Remove Product
  |--------------------------------------------------------------------------
  */

  const handleRemove = async (productId) => {
    try {
      setError("");
      setRemovingProduct(productId);

      await removeFromCart(productId);
    } catch (error) {
      console.error("Remove cart item error:", error);

      setError(
        error?.message ||
          "Failed to remove product from cart."
      );
    } finally {
      setRemovingProduct(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shopping Cart
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Review your products before checkout.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Cart Products */}
          <div className="space-y-5 lg:col-span-2">

            {Object.entries(byVendor).map(
              ([vendorName, vendorItems]) => (
                <section
                  key={vendorName}
                  className="overflow-hidden rounded-xl border bg-background shadow-sm"
                >

                  {/* Vendor Header */}
                  <div className="border-b bg-muted/40 px-4 py-4 sm:px-6">
                    <h2 className="font-semibold">
                      {vendorName}
                    </h2>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {vendorItems.length}{" "}
                      {vendorItems.length === 1
                        ? "product"
                        : "products"}
                    </p>
                  </div>

                  {/* Products */}
                  <div className="divide-y">
                    {vendorItems.map((item) => {
                      const product = item.product;

                      if (!product) {
                        return null;
                      }

                      const image =
                        product.images?.[0];

                      const price = getFinalPrice(product);

                      const quantity = Number(
                        item.quantity || 1
                      );

                      const subtotal =
                        price * quantity;

                      const isUpdating =
                        updatingProduct ===
                        product._id;

                      const isRemoving =
                        removingProduct ===
                        product._id;

                      return (
                        <div
                          key={product._id}
                          className="p-4 sm:p-6"
                        >
                          <div className="flex gap-4">

                            {/* Image */}
                            <Link
                              to={`/products/${product._id}`}
                              className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted sm:h-28 sm:w-28"
                            >
                              {image ? (
                                <img
                                  src={image}
                                  alt={product.title}
                                  className="h-full w-full object-cover transition hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </Link>

                            {/* Product Info */}
                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">

                                <div>
                                  <Link
                                    to={`/products/${product._id}`}
                                    className="line-clamp-2 font-medium hover:underline"
                                  >
                                    {product.title}
                                  </Link>

                                  <p className="mt-1 text-sm text-muted-foreground">
                                    RS {price.toFixed(2)}
                                  </p>
                                </div>

                                {/* Remove */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    handleRemove(
                                      product._id
                                    )
                                  }
                                  disabled={
                                    isRemoving ||
                                    isUpdating
                                  }
                                >
                                  {isRemoving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>

                              </div>

                              {/* Bottom */}
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">

                                {/* Quantity */}
                                <div className="flex items-center gap-2">

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={
                                      quantity <= 1 ||
                                      isUpdating ||
                                      isRemoving
                                    }
                                    onClick={() =>
                                      handleQuantityChange(
                                        product._id,
                                        quantity - 1
                                      )
                                    }
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Minus className="h-3.5 w-3.5" />
                                    )}
                                  </Button>

                                  <span className="w-10 text-center text-sm font-medium">
                                    {quantity}
                                  </span>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={
                                      isUpdating ||
                                      isRemoving
                                    }
                                    onClick={() =>
                                      handleQuantityChange(
                                        product._id,
                                        quantity + 1
                                      )
                                    }
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="h-3.5 w-3.5" />
                                    )}
                                  </Button>

                                </div>

                                {/* Subtotal */}
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">
                                    Subtotal
                                  </p>

                                  <p className="font-semibold">
                                    RS {subtotal.toFixed(2)}
                                  </p>
                                </div>

                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            )}
          </div>

          {/* Summary */}
          <aside>
            <div className="sticky top-6 rounded-xl border bg-background p-5 shadow-sm sm:p-6">

              <h2 className="text-lg font-semibold">
                Order Summary
              </h2>

              <div className="mt-5 space-y-3">

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Items
                  </span>

                  <span>
                    {items.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.quantity || 0
                        ),
                      0
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span>
                    RS {Number(total || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Shipping
                  </span>

                  <span>
                    Calculated at checkout
                  </span>
                </div>

              </div>

              <div className="my-5 border-t" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-bold">
                  RS {Number(total || 0).toFixed(2)}
                </span>
              </div>

              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={() =>
                  navigate("/checkout")
                }
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="mt-3 w-full"
                asChild
              >
                <Link to="/products">
                  Continue Shopping
                </Link>
              </Button>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
