import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function AdminOrders() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await api("/orders/admin/all", { accessToken });
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (loading) {
    return <p className="text-muted-foreground">Loading orders...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Orders</h1>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-medium">
                    {order.orderNumber ||
                      `Order #${order._id.slice(-8).toUpperCase()}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  {order.user && (
                    <p className="text-sm text-muted-foreground">
                      Customer: {order.user.name} ({order.user.email})
                    </p>
                  )}
                </div>

                {/* View only – no status change */}
                <Badge className="capitalize">{order.status}</Badge>
              </div>

              <div className="space-y-2 border-t pt-3">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm items-center"
                  >
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-10 w-10 rounded object-cover border"
                        />
                      )}
                      <div>
                        <span>
                          {item.title} × {item.quantity}
                        </span>
                        {item.vendor?.storeName && (
                          <p className="text-xs text-muted-foreground">
                            {item.vendor.storeName}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium">
                      $
                      {(
                        item.subtotal ||
                        item.price * item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-3 pt-3 border-t font-semibold">
                <span>Total</span>
                <span>${Number(order.totalAmount || 0).toFixed(2)}</span>
              </div>

              {order.status === "cancelled" && order.cancellationReason && (
                <p className="mt-3 text-sm text-destructive">
                  Cancelled: {order.cancellationReason}
                </p>
              )}

              {order.shippingAddress && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Ship to: {order.shippingAddress.fullName},{" "}
                  {order.shippingAddress.address}, {order.shippingAddress.city}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}