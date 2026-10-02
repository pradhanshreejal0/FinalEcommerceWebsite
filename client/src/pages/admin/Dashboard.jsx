import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Package,
  ShoppingBag,
  Tag,
  MessageCircle,
  Percent,
  Wallet,
  Download,
  TrendingUp,
  Store,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, downloadReport } from "@/lib/api";
import AnalyticsBarChart from "@/components/AnalyticsBarChart";

const cards = [
  { key: "totalUsers", label: "Total Users", icon: Users, to: "/admin/users" },
  { key: "totalProducts", label: "Products", icon: Package, to: "/admin" },
  { key: "totalOrders", label: "Orders in period", icon: ShoppingBag, to: "/admin/orders" },
  { key: "totalVendors", label: "Approved Vendors", icon: Store, to: "/admin/vendors/manage" },
];

function getRange(months) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function AdminDashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [popular, setPopular] = useState([]);
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
        const [statsData, popularData] = await Promise.all([
          api(`/stats/admin?${query}`, { accessToken }),
          api("/stats/popular", { accessToken }),
        ]);
        if (!cancelled) {
          setStats(statsData);
          setPopular(popularData);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, range.startDate, range.endDate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const query = new URLSearchParams(range).toString();
      await downloadReport(`/stats/admin/report.pdf?${query}`, { accessToken });
    } catch (err) {
      setError(err.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor sales, platform earnings, orders and marketplace activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
          <button onClick={handleDownload} disabled={downloading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, to }) => (
          <Link key={key} to={to} className="rounded-xl border bg-background p-5 transition hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-bold">{loading ? "—" : stats?.[key] ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Platform commission</span><Wallet className="h-4 w-4 text-primary" /></div>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : `RS ${Number(stats?.totalPlatformCommission || 0).toFixed(2)}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">Your marketplace commission from product sales.</p>
        </div>
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Product sales</span><TrendingUp className="h-4 w-4 text-primary" /></div>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : `RS ${Number(stats?.totalSalesSubtotal || 0).toFixed(2)}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sales subtotal before delivery fees.</p>
        </div>
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Commission rate</span><Percent className="h-4 w-4 text-muted-foreground" /></div>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : `${stats?.commissionPercentage ?? 10}%`}</p>
          <p className="mt-1 text-xs text-muted-foreground">Configured under Admin → Settings.</p>
        </div>
      </div>

      <AnalyticsBarChart data={stats?.monthlySales || []} valueKey="sales" valueLabel="Marketplace sales" formatValue={(value) => `RS ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Order status</h2><ShoppingBag className="h-4 w-4 text-muted-foreground" /></div>
          <div className="space-y-3">
            {(stats?.orderStatus || []).map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm capitalize text-muted-foreground">{row.status}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (row.orders / Math.max(stats?.totalOrders || 1, 1)) * 100)}%` }} /></div>
                <span className="w-12 text-right text-sm font-medium">{row.orders}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Top products by sales</h2>
          <div className="space-y-3">
            {(stats?.topProducts || []).slice(0, 6).map((product, index) => (
              <div key={`${product.title}-${index}`} className="flex items-center gap-3">
                <span className="w-6 text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.title}</p><p className="text-xs text-muted-foreground">{product.units} units sold</p></div>
                <span className="text-sm font-semibold">RS {Number(product.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            {!stats?.topProducts?.length && <p className="text-sm text-muted-foreground">No sales data for this period.</p>}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Most viewed products</h2><Link to="/admin/chats" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"><MessageCircle className="h-4 w-4" /> Support</Link></div>
        {loading ? <p className="text-muted-foreground">Loading...</p> : popular.length === 0 ? <p className="text-muted-foreground">No view data yet.</p> : (
          <div className="rounded-xl border divide-y">
            {popular.map((p, index) => (
              <div key={p._id} className="flex items-center gap-4 p-4">
                <span className="w-6 text-sm font-medium text-muted-foreground">#{index + 1}</span>
                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="h-12 w-12 rounded object-cover border" loading="lazy" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.title}</p><p className="text-sm text-muted-foreground">{p.vendor?.storeName} · {p.category?.name}</p></div>
                <div className="text-right"><p className="font-semibold">{p.views || 0} views</p><p className="text-sm text-muted-foreground">RS {Number(p.price).toFixed(2)}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
