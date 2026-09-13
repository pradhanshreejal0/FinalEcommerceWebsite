import {  useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const TABS = [
  {
    key: "active",
    label: "Active",
    icon: Clock3,
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
  },
];

const statusStyles = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "bg-yellow-100 text-yellow-800",
  },
  processing: {
    label: "Processing",
    icon: Package,
    className: "bg-blue-100 text-blue-800",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    className: "bg-purple-100 text-purple-800",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-red-100 text-red-800",
  },
};

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-NP")}`;
}

function StatusBadge({ status }) {
  const config = statusStyles[status] || statusStyles.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function getItemCount(order) {
  return (
    order?.items?.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    ) || 0
  );
}

function getVendorNames(order) {
  if (!order?.items?.length) return [];

  const names = order.items
    .map((item) => item.vendor?.storeName)
    .filter(Boolean);

  return [...new Set(names)];
}

export default function Orders() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!accessToken || user?.role !== "customer") {
        if (!cancelled) {
          setOrders([]);
          setLoading(false);
        }

        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      try {
        const data = await api(
          `/orders/my-orders?status=${encodeURIComponent(activeTab)}`,
          {
            accessToken,
          }
        );

        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);

        if (!cancelled) {
          setOrders([]);
          setError(
            err?.message ||
              "Failed to load your orders. Please try again."
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
  }, [activeTab, accessToken, user?.role]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
  };

  if (!accessToken || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

          <h1 className="text-2xl font-bold">
            Please sign in
          </h1>

          <p className="mt-2 text-muted-foreground">
            Sign in to view your orders.
          </p>

          <Button
            className="mt-6"
            onClick={() => navigate("/login")}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "customer") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

          <h1 className="text-2xl font-bold">
            Customer orders only
          </h1>

          <p className="mt-2 text-muted-foreground">
            This page is available for customer accounts.
          </p>

          <Button
            className="mt-6"
            onClick={() => navigate("/")}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <ShoppingBag className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              My Orders
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Track your current orders and view your order history.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-xl border bg-muted/30 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                  selected
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-medium">
              Unable to load orders
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-75 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />

            <p className="mt-3 text-sm text-muted-foreground">
              Loading orders...
            </p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-dashed p-10 text-center">
          {activeTab === "active" && (
            <>
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />

              <h2 className="mt-4 text-xl font-semibold">
                No active orders
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                You don't have any pending, processing, or shipped
                orders right now.
              </p>
            </>
          )}

          {activeTab === "completed" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />

              <h2 className="mt-4 text-xl font-semibold">
                No completed orders
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Delivered orders will appear here.
              </p>
            </>
          )}

          {activeTab === "cancelled" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />

              <h2 className="mt-4 text-xl font-semibold">
                No cancelled orders
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Orders cancelled by you or a vendor will appear here.
              </p>
            </>
          )}

          <Button
            asChild
            className="mt-6"
          >
            <Link to="/">
              Continue Shopping
            </Link>
          </Button>
        </div>
      ) : (
        /* Orders */
        <div className="space-y-5">
          {orders.map((order) => {
            const itemCount = getItemCount(order);
            const vendorNames = getVendorNames(order);

            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-2xl border bg-background shadow-sm"
              >
                {/* Order header */}
                <div className="border-b bg-muted/20 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">
                          {order.orderNumber ||
                            `Order #${order._id?.slice(-8)}`}
                        </h2>

                        <StatusBadge status={order.status} />
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <Link to={`/orders/${order._id}`}>
                        {activeTab === "completed"
                          ? "View Receipt"
                          : "View Order"}
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Order information */}
                <div className="grid gap-4 border-b p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
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
                      Vendors
                    </p>

                    <p className="mt-1 font-medium">
                      {vendorNames.length > 0
                        ? vendorNames.length === 1
                          ? vendorNames[0]
                          : `${vendorNames.length} vendors`
                        : "Marketplace"}
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

                    <p className="mt-1 text-lg font-bold">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Product preview */}
                <div className="divide-y">
                  {order.items?.map((item, index) => {
                    const itemStatus =
                      item.status || order.status;

                    return (
                      <div
                        key={
                          item._id ||
                          `${order._id}-${item.product?._id || index}`
                        }
                        className="flex gap-4 p-4 sm:p-5"
                      >
                        {/* Product image */}
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted sm:h-24 sm:w-24">
                          {item.image ||
                          item.product?.images?.[0] ? (
                            <img
                              src={
                                item.image ||
                                item.product?.images?.[0]
                              }
                              alt={item.title || "Product"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Product details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-medium">
                                {item.title ||
                                  item.product?.title ||
                                  "Product"}
                              </h3>

                              {item.vendor?.storeName && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Sold by{" "}
                                  {item.vendor.storeName}
                                </p>
                              )}
                            </div>

                            <StatusBadge status={itemStatus} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                            <span>
                              Qty: {item.quantity}
                            </span>

                            <span>
                              Price:{" "}
                              {formatCurrency(item.price)}
                            </span>

                            <span className="font-medium text-foreground">
                              Subtotal:{" "}
                              {formatCurrency(
                                item.subtotal ??
                                  Number(item.price || 0) *
                                    Number(item.quantity || 0)
                              )}
                            </span>
                          </div>

                          {itemStatus === "cancelled" &&
                            item.cancellationReason && (
                              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                                <span className="font-medium">
                                  Cancellation reason:
                                </span>{" "}
                                {item.cancellationReason}
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
