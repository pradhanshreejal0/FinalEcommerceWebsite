import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Package, ShoppingBag, AlertTriangle, Clock, XCircle, Download, Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, downloadReport } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import AnalyticsBarChart from "@/components/AnalyticsBarChart";

const cards = [
  { key: "totalSales", label: "Gross sales", icon: DollarSign, format: (v) => `RS ${Number(v || 0).toFixed(2)}`, to: "/vendor/orders" },
  { key: "totalEarnings", label: "Your earnings", icon: DollarSign, format: (v) => `RS ${Number(v || 0).toFixed(2)}`, to: "/vendor/earnings" },
  { key: "totalCommissionDeducted", label: "Platform fee", icon: DollarSign, format: (v) => `RS ${Number(v || 0).toFixed(2)}`, to: "/vendor/earnings" },
  { key: "totalProducts", label: "Products", icon: Package, format: (v) => v ?? 0, to: "/vendor/products" },
  { key: "pendingOrders", label: "Pending Orders", icon: ShoppingBag, format: (v) => v ?? 0, to: "/vendor/orders" },
  { key: "lowStock", label: "Low Stock", icon: AlertTriangle, format: (v) => v ?? 0, to: "/vendor/products?lowStock=true" },
];

function getRange(months) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function VendorDashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [vendorStatus, setVendorStatus] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [period, setPeriod] = useState("6");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const range = useMemo(() => getRange(Number(period)), [period]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(range).toString();
        const [statsData, profile] = await Promise.all([
          api(`/stats/vendor?${query}`, { accessToken }).catch(() => null),
          api("/vendors/me", { accessToken }).catch(() => null),
        ]);
        if (cancelled) return;
        if (statsData) setStats(statsData);
        if (profile) { setVendorStatus(profile.status || null); setStoreName(profile.storeName || ""); }
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [accessToken, range.startDate, range.endDate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const query = new URLSearchParams(range).toString();
      await downloadReport(`/stats/vendor/report.pdf?${query}`, { accessToken });
    } catch (err) {
      setError(err.message || "Failed to download report");
    } finally { setDownloading(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold">Vendor Dashboard</h1>{vendorStatus && <Badge variant={vendorStatus === "approved" ? "default" : vendorStatus === "rejected" ? "destructive" : "secondary"} className="capitalize">{vendorStatus}</Badge>}</div>
          <p className="mt-1 text-sm text-muted-foreground">{storeName ? `${storeName} · ` : ""}Track sales, earnings, orders and inventory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option>
          </select>
          <button onClick={handleDownload} disabled={downloading || vendorStatus !== "approved"} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </button>
        </div>
      </div>

      {vendorStatus === "pending" && <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-medium text-amber-900 dark:text-amber-200">Store pending approval{storeName ? ` — ${storeName}` : ""}</p><p className="mt-1 text-muted-foreground">An admin will review your vendor account. You can update your profile, but you cannot add or publish products until approved.</p><Link to="/vendor/profile" className="mt-2 inline-block font-medium underline underline-offset-2">Complete your store profile →</Link></div></div>}
      {vendorStatus === "rejected" && <div className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-medium text-destructive">Vendor application rejected</p><p className="mt-1 text-muted-foreground">Contact support or update your profile and wait for admin review.</p></div></div>}
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ key, label, icon: Icon, format, to }) => <Link key={key} to={to} className="flex flex-col gap-3 rounded-xl border bg-background p-5 transition hover:border-primary/40 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-bold">{loading ? "—" : format(stats?.[key])}</p></Link>)}
      </div>

      <AnalyticsBarChart data={stats?.monthlySales || []} valueKey="sales" valueLabel="Gross sales" formatValue={(value) => `RS ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Sales breakdown</h2><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-4"><div><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Gross sales</span><b>RS {Number(stats?.totalSales || 0).toFixed(2)}</b></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: "100%" }} /></div></div><div><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Your earnings</span><b>RS {Number(stats?.totalEarnings || 0).toFixed(2)}</b></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (Number(stats?.totalEarnings || 0) / Math.max(Number(stats?.totalSales || 0), 1)) * 100)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Platform fee</span><b>RS {Number(stats?.totalCommissionDeducted || 0).toFixed(2)}</b></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (Number(stats?.totalCommissionDeducted || 0) / Math.max(Number(stats?.totalSales || 0), 1)) * 100)}%` }} /></div></div></div></div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm"><h2 className="mb-4 font-semibold">Top products</h2><div className="space-y-3">{(stats?.topProducts || []).slice(0, 6).map((product, index) => <div key={`${product.title}-${index}`} className="flex items-center gap-3"><span className="w-6 text-xs font-semibold text-muted-foreground">#{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.title}</p><p className="text-xs text-muted-foreground">{product.units} units</p></div><span className="text-sm font-semibold">RS {Number(product.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>)}{!stats?.topProducts?.length && <p className="text-sm text-muted-foreground">No sales data for this period.</p>}</div></div>
      </div>
    </div>
  );
}
