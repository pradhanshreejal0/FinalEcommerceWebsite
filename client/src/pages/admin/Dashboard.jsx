import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Package, ShoppingBag, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const cards = [
  { key: "totalUsers", label: "Total Users", icon: Users, to: "/admin/vendors" },
  { key: "totalProducts", label: "Products", icon: Package, to: "/admin" },
  { key: "totalOrders", label: "Orders", icon: ShoppingBag, to: "/admin/orders" },
  { key: "totalCategories", label: "Categories", icon: Tag, to: "/admin/categories" },
];

export default function AdminDashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [statsData, popularData] = await Promise.all([
          api("/stats/admin", { accessToken }),
          api("/stats/popular", { accessToken }),
        ]);
        if (!cancelled) {
          setStats(statsData);
          setPopular(popularData);
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
  }, [accessToken]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {cards.map(({ key, label, icon: Icon, to }) => (
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
              {loading ? "—" : stats?.[key] ?? 0}
            </p>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Most viewed by customers</h2>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : popular.length === 0 ? (
        <p className="text-muted-foreground">No view data yet.</p>
      ) : (
        <div className="rounded-xl border divide-y">
          {popular.map((p, index) => (
            <div key={p._id} className="flex items-center gap-4 p-4">
              <span className="w-6 text-sm font-medium text-muted-foreground">
                #{index + 1}
              </span>
              {p.images?.[0] && (
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="h-12 w-12 rounded object-cover border"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground">
                  {p.vendor?.storeName} · {p.category?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{p.views || 0} views</p>
                <p className="text-sm text-muted-foreground">
                  ${Number(p.price).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}