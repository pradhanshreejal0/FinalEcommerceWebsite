import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminCoupons() {
  const { accessToken } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    discountType: "percent",
    discountValue: 10,
    minOrderAmount: 0,
    usageLimit: "",
    description: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api("/coupons", { accessToken });
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/coupons", {
        method: "POST",
        accessToken,
        body: {
          ...form,
          usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
          discountValue: Number(form.discountValue),
          minOrderAmount: Number(form.minOrderAmount) || 0,
        },
      });
      setForm({
        code: "",
        discountType: "percent",
        discountValue: 10,
        minOrderAmount: 0,
        usageLimit: "",
        description: "",
      });
      await load();
    } catch (err) {
      setError(err.message || "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api(`/coupons/${id}`, { method: "DELETE", accessToken });
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Promo codes</h1>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <form
        onSubmit={create}
        className="mb-8 grid gap-3 rounded-xl border bg-background p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <Label>Code</Label>
          <Input
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
            }
            placeholder="SAVE10"
            required
          />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.discountType}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountType: e.target.value }))
            }
          >
            <option value="percent">Percent %</option>
            <option value="fixed">Fixed RS</option>
          </select>
        </div>
        <div>
          <Label>Value</Label>
          <Input
            type="number"
            min="0"
            value={form.discountValue}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountValue: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <Label>Min order (RS)</Label>
          <Input
            type="number"
            min="0"
            value={form.minOrderAmount}
            onChange={(e) =>
              setForm((f) => ({ ...f, minOrderAmount: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Usage limit (blank = unlimited)</Label>
          <Input
            type="number"
            min="1"
            value={form.usageLimit}
            onChange={(e) =>
              setForm((f) => ({ ...f, usageLimit: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create coupon
          </Button>
        </div>
      </form>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Used</th>
                <th className="p-3">Active</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="border-b last:border-0">
                  <td className="p-3 font-mono font-medium">{c.code}</td>
                  <td className="p-3">
                    {c.discountType === "percent"
                      ? `${c.discountValue}%`
                      : `RS ${c.discountValue}`}
                  </td>
                  <td className="p-3">
                    {c.usedCount}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="p-3">{c.isActive ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(c._id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!coupons.length && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No coupons yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
