import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  Menu,
  LogOut,
  Wallet,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const navItems = [
  { label: "Dashboard", to: "/vendor", icon: LayoutDashboard },
  { label: "My Products", to: "/vendor/products", icon: Package },
  { label: "Orders", to: "/vendor/orders", icon: ShoppingBag },
  { label: "Earnings", to: "/vendor/earnings", icon: Wallet },
  { label: "Store Profile", to: "/vendor/profile", icon: Store },
];

function SidebarLinks({ onLogout, vendorStatus }) {
  const location = useLocation();
  return (
    <nav className="flex h-full flex-col gap-1">
      <div className="flex-1 space-y-0.5">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active =
            to === "/vendor"
              ? location.pathname === "/vendor"
              : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>

      {vendorStatus && vendorStatus !== "approved" && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          Status: <span className="font-semibold capitalize">{vendorStatus}</span>
          {vendorStatus === "pending" && (
            <p className="mt-1 opacity-90">Waiting for admin approval.</p>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        className="mt-1 justify-start gap-3 text-muted-foreground hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </nav>
  );
}

export default function VendorLayout() {
  const { logout, accessToken } = useAuth();
  const navigate = useNavigate();
  const [vendorStatus, setVendorStatus] = useState(null);
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await api("/vendors/me", { accessToken });
        if (!cancelled && profile) {
          setVendorStatus(profile.status || null);
          setStoreName(profile.storeName || "");
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
        <div className="mb-6 px-1">
          <h2 className="text-lg font-bold tracking-tight">Vendor Panel</h2>
          {storeName && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {storeName}
            </p>
          )}
          {vendorStatus === "approved" && (
            <Badge className="mt-2" variant="default">
              Approved
            </Badge>
          )}
        </div>
        <SidebarLinks onLogout={handleLogout} vendorStatus={vendorStatus} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background p-4 md:hidden">
          <div>
            <h2 className="text-lg font-bold">Vendor Panel</h2>
            {storeName && (
              <p className="text-xs text-muted-foreground">{storeName}</p>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <h2 className="mb-6 text-lg font-bold">Vendor Panel</h2>
              <SidebarLinks onLogout={handleLogout} vendorStatus={vendorStatus} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
