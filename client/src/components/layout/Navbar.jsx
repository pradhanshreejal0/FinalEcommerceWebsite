import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Menu,
  User,
  Search,
  MessageCircle,
  Heart,
  Truck,
  ShieldCheck,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

// Category bar links. Add a `badge` to flag an item, like "Deals" / "Sale".
const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/products", badge: { text: "Hot", variant: "hot" } },
  { label: "Categories", to: "/categories" },
];

const trustItems = [
  { icon: Truck, label: "Free shipping and returns" },
  { icon: ShieldCheck, label: "Money back guarantee" },
  { icon: Clock, label: "24/7 online support" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/products");
    }
  };

  const messagesLink = user?.role === "vendor" ? "/vendor/chats" : "/chats";

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* Tier 1: utility bar — menu / logo / search / account actions */}
      <div className="bg-muted/40 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="mt-6 space-y-6">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center rounded-full border bg-muted/40 overflow-hidden">
                    <div className="pl-3 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products.."
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-3 rounded-full">
                    Search
                  </Button>
                </form>

                <nav className="flex flex-col gap-1 items-center justify-center">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {link.label}
                      {link.badge && (
                        <Badge
                          className={
                            link.badge.variant === "hot"
                              ? "bg-red-100 text-red-600 hover:bg-red-100"
                              : "bg-indigo-100 text-indigo-600 hover:bg-indigo-100"
                          }
                        >
                          {link.badge.text}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </nav>

                <Separator />

                {user ? (
                  <div className="flex flex-col gap-1">
                    <Link to="/profile" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      My Profile
                    </Link>
                    <Link to="/orders" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      My Orders
                    </Link>
                    <Link to="/wishlist" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      Wishlist
                    </Link>
                    <Link to={messagesLink} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      Messages
                    </Link>
                    <Button variant="outline" className="mt-2 rounded-full" onClick={logout}>
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="rounded-full">
                    <Link to="/login">Login</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            to="/"
            className="hidden lg:flex items-center gap-2 shrink-0 hover:opacity-80 transition"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">YourStore</span>
          </Link>

          {/* Search — grows to fill the middle */}
          <form onSubmit={handleSearch} className="flex flex-1 justify-center">
            <div className="flex w-full max-w-md items-center rounded-full border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products.."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                className="pr-4 text-muted-foreground hover:text-foreground"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Account actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link to="/wishlist">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                <Heart className="h-4 w-4" />
                Wishlist
              </Button>
            </Link>

            <Link to="/cart" className="relative">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Cart
              </Button>
              {itemCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                    <User className="h-4 w-4" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={messagesLink}>Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-full gap-1.5">
                <Link to="/login">
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tier 2: category bar — categories dropdown / nav links / contact */}
      <div className="hidden lg:block border-b bg-background">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Menu className="h-4 w-4" />
                  All Categories
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/categories">Browse all</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <nav className="flex items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  {link.label}
                  {link.badge && (
                    <Badge
                      className={
                        link.badge.variant === "hot"
                          ? "bg-red-100 text-red-600 hover:bg-red-100"
                          : "bg-indigo-100 text-indigo-600 hover:bg-indigo-100"
                      }
                    >
                      {link.badge.text}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {user && (
            <Link
              to={messagesLink}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              Messages
            </Link>
          )}
        </div>
      </div>

      {/* Tier 3: trust strip */}
      <div className="hidden md:block bg-muted/40 border-b">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4 text-xs text-muted-foreground">
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
