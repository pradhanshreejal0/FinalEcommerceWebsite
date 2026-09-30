import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminPayouts() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await api("/payouts/admin", { accessToken });
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const createPayout = async (vendorId, amount) => {
    setBusy(vendorId);
    try {
      await api("/payouts", {
        method: "POST",
        accessToken,
        body: { vendorId, amount },
      });
      await load();
    } catch (err) {
      setError(err.message || "Payout failed");
    } finally {
      setBusy("");
    }
  };

  const markPaid = async (id) => {
    setBusy(id);
    try {
      await api(`/payouts/${id}/status`, {
        method: "PUT",
        accessToken,
        body: { status: "paid" },
      });
      await load();
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Vendor payouts</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Platform keeps commission; pay vendors their earnings after sales.
      </p>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <h2 className="mb-3 font-semibold">Balances</h2>
      <div className="mb-10 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">Vendor</th>
              <th className="p-3">Gross earnings</th>
              <th className="p-3">Commission taken</th>
              <th className="p-3">Available to pay</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(data?.vendors || []).map((row) => (
              <tr key={row.vendor._id} className="border-b last:border-0">
                <td className="p-3 font-medium">{row.vendor.storeName}</td>
                <td className="p-3">RS {Number(row.grossEarnings).toFixed(2)}</td>
                <td className="p-3">RS {Number(row.commission).toFixed(2)}</td>
                <td className="p-3 font-semibold">
                  RS {Number(row.available).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    disabled={row.available <= 0 || busy === row.vendor._id}
                    onClick={() =>
                      createPayout(row.vendor._id, row.available)
                    }
                  >
                    {busy === row.vendor._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create payout"
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 font-semibold">Recent payouts</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">Vendor</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(data?.recentPayouts || []).map((p) => (
              <tr key={p._id} className="border-b last:border-0">
                <td className="p-3">{p.vendor?.storeName || "—"}</td>
                <td className="p-3">RS {Number(p.amount).toFixed(2)}</td>
                <td className="p-3 capitalize">{p.status}</td>
                <td className="p-3 text-right">
                  {p.status !== "paid" && p.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p._id}
                      onClick={() => markPaid(p._id)}
                    >
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!data?.recentPayouts?.length && (
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
