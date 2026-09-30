import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function MyReturns() {
  const { accessToken } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const data = await api("/returns/my", { accessToken });
        setList(Array.isArray(data) ? data : []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading returns…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">My return requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Request returns from a delivered order page.
      </p>
      <div className="mt-6 space-y-3">
        {list.map((r) => (
          <div key={r._id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {r.product?.title || "Item"} —{" "}
                <span className="capitalize text-muted-foreground">
                  {r.status}
                </span>
              </p>
              {r.order?._id && (
                <Link
                  to={`/orders/${r.order._id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Order {r.order.orderNumber || ""}
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Refund amount: RS {Number(r.refundAmount || 0).toFixed(2)}
            </p>
          </div>
        ))}
        {!list.length && (
          <p className="text-sm text-muted-foreground">No return requests yet.</p>
        )}
      </div>
    </main>
  );
}
