import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
// import { BarChart3, Users, Tag, Image, ShoppingBag, Menu, LogOut } from "lucide-react";
import { BarChart3, Users, Tag, Image, ShoppingBag, Menu, LogOut, Settings as SettingsIcon, MessageCircle, } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";


const navItems = [
  { label: "Analytics", to: "/admin", icon: BarChart3 },
  { label: "Messages", to: "/admin/chats", icon: MessageCircle },
  { label: "Vendor Approvals", to: "/admin/vendors", icon: Users },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Categories", to: "/admin/categories", icon: Tag },
  { label: "Ads & Banners", to: "/admin/ads", icon: Image },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Settings", to: "/admin/settings", icon: SettingsIcon },
];

function SidebarLinks({ onLogout }) {
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-1 h-full">
      <div className="flex-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname === to ||
              (to !== "/admin" && location.pathname.startsWith(to))
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <Button
        variant="ghost"
        className="justify-start gap-3 text-muted-foreground hover:text-destructive mt-4"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </nav>
  );
}

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/20 p-4">
        <h2 className="mb-6 px-3 text-lg font-bold">Admin Panel</h2>
        <SidebarLinks onLogout={handleLogout} />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b p-4 md:hidden">
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <h2 className="mb-6 text-lg font-bold">Admin Panel</h2>
              <SidebarLinks onLogout={handleLogout} />
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
