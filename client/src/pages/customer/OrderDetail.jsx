
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "bg-warning/10 text-warning-foreground border-warning/20",
  },

  processing: {
    label: "Processing",
    icon: Package,
    className: "bg-info/10 text-info-foreground border-info/20",
  },

  shipped: {
    label: "Shipped",
    icon: Truck,
    className: "bg-secondary text-secondary-foreground border-secondary",
  },

  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    className: "bg-success/10 text-success-foreground border-success/20",
  },

  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-NP")}`;
}

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 capitalize ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { accessToken } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!accessToken || !id) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await api(`/orders/${id}`, {
          accessToken,
        });

        if (!cancelled) {
          setOrder(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message || "Failed to load order"
          );
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
  }, [id, accessToken]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex min-h-75 items-center justify-center">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />

            <p className="mt-3 text-sm text-muted-foreground">
              Loading order...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-semibold">
            {error || "Order not found"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't load this order.
          </p>

          <Button asChild className="mt-6">
            <Link to="/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const orderNumber =
    order.orderNumber ||
    `#${order._id?.slice(-8).toUpperCase()}`;

  const itemCount =
    order.items?.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    ) || 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        to="/orders"
        className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground hover:underline"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="mt-6 rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Order
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {orderNumber}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>

          <StatusBadge status={order.status} />
        </div>

        {/* Quick information */}
        <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Items
            </p>

            <p className="mt-1 font-medium">
              {itemCount}{" "}
              {itemCount === 1 ? "item" : "items"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment
            </p>

            <p className="mt-1 font-medium capitalize">
              {order.paymentMethod === "cod"
                ? "Cash on Delivery"
                : order.paymentMethod}
            </p>

            <p className="text-xs capitalize text-muted-foreground">
              {order.paymentStatus || "pending"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total
            </p>

            <p className="mt-1 text-xl font-bold">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <section className="mt-6 rounded-2xl border bg-background shadow-sm">
        <div className="border-b p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />

            <h2 className="text-lg font-semibold">
              Order Items
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Each vendor's order status is shown separately.
          </p>
        </div>

        <div className="divide-y">
          {order.items?.map((item, index) => {
            const itemStatus =
              item.status || order.status;

            const subtotal =
              item.subtotal ??
              Number(item.price || 0) *
                Number(item.quantity || 0);

            return (
              <div
                key={
                  item._id ||
                  `${item.product?._id || "item"}-${index}`
                }
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  {/* Image */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted">
                    {item.image ||
                    item.product?.images?.[0] ? (
                      <img
                        src={
                          item.image ||
                          item.product?.images?.[0]
                        }
                        alt={item.title || "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {item.title ||
                            item.product?.title ||
                            "Product"}
                        </h3>

                        {item.vendor?.storeName && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Sold by{" "}
                            <span className="font-medium text-foreground">
                              {item.vendor.storeName}
                            </span>
                          </p>
                        )}
                      </div>

                      <StatusBadge status={itemStatus} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">
                          Quantity
                        </span>

                        <p className="font-medium">
                          {item.quantity}
                        </p>
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Unit Price
                        </span>

                        <p className="font-medium">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Subtotal
                        </span>

                        <p className="font-semibold">
                          {formatCurrency(subtotal)}
                        </p>
                      </div>
                    </div>

                    {/* Cancellation reason */}
                    {itemStatus === "cancelled" &&
                      item.cancellationReason && (
                        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                          <p className="font-medium">
                            Cancellation reason
                          </p>

                          <p className="mt-1">
                            {item.cancellationReason}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="border-t bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              Order Total
            </span>

            <span className="text-2xl font-bold">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>
      </section>

      {/* Shipping + Payment */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Shipping */}
        <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />

            <h2 className="font-semibold">
              Shipping Address
            </h2>
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <p className="font-medium">
              {order.shippingAddress?.fullName}
            </p>

            <p className="text-muted-foreground">
              {order.shippingAddress?.phone}
            </p>

            <p className="pt-2">
              {order.shippingAddress?.address}
            </p>

            <p>
              {order.shippingAddress?.city}
              {order.shippingAddress?.postalCode
                ? `, ${order.shippingAddress.postalCode}`
                : ""}
            </p>

            <p>
              {order.shippingAddress?.country}
            </p>
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />

            <h2 className="font-semibold">
              Payment Information
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Method
              </span>

              <span className="font-medium capitalize">
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Status
              </span>

              <span className="font-medium capitalize">
                {order.paymentStatus || "pending"}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t pt-3">
              <span className="font-medium">
                Total
              </span>

              <span className="font-bold">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Overall cancellation */}
      {order.status === "cancelled" &&
        order.cancellationReason && (
          <section className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive sm:p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <h2 className="font-semibold">
                  Order Cancelled
                </h2>

                <p className="mt-1 text-sm">
                  {order.cancellationReason}
                </p>
              </div>
            </div>
          </section>
        )}

      {/* Completed receipt note */}
      {order.status === "delivered" && (
        <section className="mt-6 rounded-2xl border border-success/20 bg-success/10 p-5 text-success-foreground sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <h2 className="font-semibold">
                Order Completed
              </h2>

              <p className="mt-1 text-sm">
                This order has been delivered successfully.
                You can keep this page as your order receipt.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Bottom navigation */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <Link to="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>

        {order.status === "delivered" && (
          <Button asChild>
            <Link to="/">
              Continue Shopping
            </Link>
          </Button>
        )}
      </div>
    </main>
  );
}
