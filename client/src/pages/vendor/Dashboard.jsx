import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Package,
  ShoppingBag,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const cards = [
  {
    key: "totalSales",
    label: "Gross sales",
    icon: DollarSign,
    format: (v) => `RS ${Number(v || 0).toFixed(2)}`,
    to: "/vendor/orders",
  },
  {
    key: "totalEarnings",
    label: "Your earnings",
    icon: DollarSign,
    format: (v) => `RS ${Number(v || 0).toFixed(2)}`,
    to: "/vendor/orders",
  },
  {
    key: "totalCommissionDeducted",
    label: "Platform fee",
    icon: DollarSign,
    format: (v) => `RS ${Number(v || 0).toFixed(2)}`,
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
  const [vendorStatus, setVendorStatus] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [statsData, profile] = await Promise.all([
          api("/stats/vendor", { accessToken }).catch(() => null),
          api("/vendors/me", { accessToken }).catch(() => null),
        ]);
        if (cancelled) return;
        if (statsData) setStats(statsData);
        if (profile) {
          setVendorStatus(profile.status || null);
          setStoreName(profile.storeName || "");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
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
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
        {vendorStatus && (
          <Badge
            variant={
              vendorStatus === "approved"
                ? "default"
                : vendorStatus === "rejected"
                  ? "destructive"
                  : "secondary"
            }
            className="w-fit capitalize"
          >
            {vendorStatus}
          </Badge>
        )}
      </div>

      {vendorStatus === "pending" && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Store pending approval
              {storeName ? ` — ${storeName}` : ""}
            </p>
            <p className="mt-1 text-muted-foreground">
              An admin will review your vendor account. You can update your
              profile, but you cannot add or publish products until approved.
            </p>
            <Link
              to="/vendor/profile"
              className="mt-2 inline-block text-sm font-medium underline underline-offset-2 hover:text-foreground"
            >
              Complete your store profile →
            </Link>
          </div>
        </div>
      )}

      {vendorStatus === "rejected" && (
        <div className="mb-6 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              Vendor application rejected
            </p>
            <p className="mt-1 text-muted-foreground">
              Contact support or update your profile and wait for admin review.
            </p>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, format, to }) => (
          <Link
            key={key}
            to={to}
            className="flex flex-col gap-3 rounded-xl border bg-background p-5 transition hover:border-primary/40 hover:shadow-md"
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
