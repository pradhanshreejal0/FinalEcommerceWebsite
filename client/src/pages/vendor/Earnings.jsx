import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function VendorEarnings() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const res = await api("/payouts/me", { accessToken });
        setData(res);
      } catch (err) {
        setData({ error: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (data?.error) {
    return <p className="text-destructive">{data.error}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Earnings & payouts</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Gross earnings</p>
          <p className="mt-1 text-2xl font-bold">
            RS {Number(data?.grossEarnings || 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Platform fee deducted</p>
          <p className="mt-1 text-2xl font-bold">
            RS {Number(data?.commission || 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Available / pending payout</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            RS {Number(data?.available || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 font-semibold">Payout history</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.history || []).map((p) => (
              <tr key={p._id} className="border-b last:border-0">
                <td className="p-3">RS {Number(p.amount).toFixed(2)}</td>
                <td className="p-3 capitalize">{p.status}</td>
                <td className="p-3">{p.reference || "—"}</td>
                <td className="p-3">
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {!data?.history?.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No payouts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
