import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["processing", "shipped", "delivered", "cancelled"];

export default function VendorOrders() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadOrders = async () => {
    try {
      const data = await api("/orders/vendor", { accessToken });
      setOrders(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await api("/orders/vendor", { accessToken });
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

  const handleStatusChange = async (orderId, status) => {
    if (status === "cancelled") {
      setCancelOrderId(orderId);
      setCancelReason("");
      setCancelOpen(true);
      return;
    }

    setUpdatingId(orderId);
    try {
      await api(`/orders/${orderId}/status`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify({ status }),
      });
      await loadOrders();
    } catch (err) {
      setError(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError("Please enter a cancellation reason");
      return;
    }

    setUpdatingId(cancelOrderId);
    try {
      await api(`/orders/${cancelOrderId}/status`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: cancelReason.trim(),
        }),
      });
      setCancelOpen(false);
      setCancelOrderId(null);
      setCancelReason("");
      await loadOrders();
    } catch (err) {
      setError(err.message || "Failed to cancel order");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading orders...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

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
                    Order #{order._id.slice(-8).toUpperCase()}
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

                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{order.status}</Badge>
                  <Select
                    value={order.status}
                    onValueChange={(value) =>
                      handleStatusChange(order._id, value)
                    }
                    disabled={updatingId === order._id}
                  >
                    <SelectTrigger className="w-35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      <span>
                        {item.title} × {item.quantity}
                      </span>
                    </div>
                    <span className="font-medium">
                      RS {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-3 pt-3 border-t font-semibold">
                <span>Your subtotal</span>
                <span>RS {Number(order.subtotal || 0).toFixed(2)}</span>
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

      {/* Cancel reason dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation reason</Label>
            <Input
              id="reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Out of stock, customer request..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!cancelReason.trim() || updatingId}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
