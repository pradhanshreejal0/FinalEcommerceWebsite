import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFinalPrice } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export default function Checkout() {
  const navigate = useNavigate();

  const { user, accessToken } = useAuth();

  const {
    cart,
    loading: cartLoading,
    resetCart,
  } = useCart();

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Nepal",
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");




  /*
  |--------------------------------------------------------------------------
  | Protect Checkout
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user.role !== "customer") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /*
  |--------------------------------------------------------------------------
  | Form Change
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Calculate Total
  |--------------------------------------------------------------------------
  */

  const items = cart?.items || [];

  const total = items.reduce((sum, item) => {
       const price = getFinalPrice(item.product);
    const quantity = Number(item.quantity || 0);

    return sum + price * quantity;
  }, 0);

  const itemCount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  /*
  |--------------------------------------------------------------------------
  | Place Order
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!accessToken) {
      setError("Your session has expired. Please login again.");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!form.address.trim()) {
      setError("Please enter your address.");
      return;
    }

    if (!form.city.trim()) {
      setError("Please enter your city.");
      return;
    }

    if (!form.country.trim()) {
      setError("Please enter your country.");
      return;
    }

    if (paymentMethod !== "cod") {
      setError(
        "Online payment is not available yet. Please select Cash on Delivery."
      );
      return;
    }



    try {
      setSubmitting(true);

      const order = await api("/orders", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          shippingAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            country: form.country.trim(),
          },
          paymentMethod,
        }),
      });

      if (!order?._id) {
        throw new Error(
          "Order was created, but the order ID was not returned."
        );
      }

      // Clear the cart in React state
      resetCart();

      // Go to order details
      navigate(`/orders/${order._id}`, {
        replace: true,
      });
    } catch (err) {
      console.error("Place order error:", err);

      setError(
        err?.message ||
          "Unable to place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (!user || cartLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading checkout...</span>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Empty Cart
  |--------------------------------------------------------------------------
  */

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-bold">
            Your cart is empty
          </h1>

          <p className="mt-2 text-muted-foreground">
            Add some products before going to checkout.
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
  | Checkout Page
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-3"
            onClick={() => navigate("/cart")}
            disabled={submitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Checkout
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Enter your delivery information and place your order.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ============================================================
                LEFT
            ============================================================ */}

            <div className="space-y-6 lg:col-span-2">

              {/* Shipping Address */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Shipping Address
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Where should we deliver your order?
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Full Name
                    </label>

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Phone Number
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="98XXXXXXXX"
                      autoComplete="tel"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label
                      htmlFor="city"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      City
                    </label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Kathmandu"
                      autoComplete="address-level2"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Address
                    </label>

                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Street, house number, area..."
                      autoComplete="street-address"
                      disabled={submitting}
                      className="w-full resize-none rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label
                      htmlFor="postalCode"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Postal Code
                      <span className="ml-1 font-normal text-muted-foreground">
                        (Optional)
                      </span>
                    </label>

                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="44600"
                      autoComplete="postal-code"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label
                      htmlFor="country"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Country
                    </label>

                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="Nepal"
                      autoComplete="country-name"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Payment Method
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Select your preferred payment method.
                  </p>
                </div>

                <div className="space-y-3">

                  {/* Cash On Delivery */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value)
                      }
                      disabled={submitting}
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Pay when your order arrives.
                      </p>
                    </div>
                  </label>

                  {/* Stripe */}
                  <div className="flex items-start gap-3 rounded-lg border p-4 opacity-60">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      disabled
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Stripe
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Online card payment — coming soon.
                      </p>
                    </div>
                  </div>

                  {/* Razorpay */}
                  <div className="flex items-start gap-3 rounded-lg border p-4 opacity-60">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      disabled
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Razorpay
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Online payment — coming soon.
                      </p>
                    </div>
                  </div>

                </div>
              </section>
            </div>

            {/* ============================================================
                RIGHT - ORDER SUMMARY
            ============================================================ */}

            <aside className="lg:col-span-1">
              <div className="sticky top-6 rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <h2 className="text-lg font-semibold">
                  Order Summary
                </h2>

                {/* Items */}
                <div className="mt-5 space-y-4">
                  {items.map((item) => {
                    const product = item.product;

                    if (!product) {
                      return null;
                    }

                    const image =
                      product.images?.[0] || "";

                    const price = getFinalPrice(product);

                    const quantity = Number(
                      item.quantity || 0
                    );

                    const subtotal =
                      price * quantity;

                    return (
                      <div
                        key={product._id}
                        className="flex gap-3"
                      >
                        {/* Image */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {image ? (
                            <img
                              src={image}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">
                            {product.title}
                          </p>

                          {product.vendor?.storeName && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {product.vendor.storeName}
                            </p>
                          )}

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              Qty: {quantity}
                            </span>

                            <span className="text-sm font-medium">
                              ${subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-5 border-t" />

                {/* Item Count */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Items
                  </span>

                  <span>{itemCount}</span>
                </div>

                {/* Subtotal */}
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span>${total.toFixed(2)}</span>
                </div>

                {/* Shipping */}
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Shipping
                  </span>

                  <span>Calculated later</span>
                </div>

                <div className="my-5 border-t" />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-xl font-bold">
                    ${total.toFixed(2)}
                  </span>
                </div>

                {/* Place Order */}
                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Place Order
                    </>
                  )}
                </Button>

                {/* Return */}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => navigate("/cart")}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Cart
                </Button>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Your order will be placed using Cash on Delivery.
                </p>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
