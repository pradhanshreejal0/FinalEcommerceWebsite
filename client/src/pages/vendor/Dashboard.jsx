import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Package, ShoppingBag, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const cards = [
  {
    key: "totalSales",
    label: "Total Sales",
    icon: DollarSign,
    format: (v) => `$${Number(v || 0).toFixed(2)}`,
    to: "/vendor/orders",
  },
  {
    key: "totalProducts",
    label: "Products",
    icon: Package,
    format: (v) => v ?? 0,
    to: "/vendor/products",
  },
  {
    key: "pendingOrders",
    label: "Pending Orders",
    icon: ShoppingBag,
    format: (v) => v ?? 0,
    to: "/vendor/orders",
  },
  {
    key: "lowStock",
    label: "Low Stock",
    icon: AlertTriangle,
    format: (v) => v ?? 0,
    to: "/vendor/products?lowStock=true",
  },
];

export default function VendorDashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api("/stats/vendor", { accessToken });
        if (!cancelled) setStats(data);
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
  }, [accessToken]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vendor Dashboard</h1>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, format, to }) => (
          <Link
            key={key}
            to={to}
            className="rounded-xl border bg-background p-5 flex flex-col gap-3 hover:shadow-md hover:border-primary/40 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {loading ? "—" : format(stats?.[key])}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}