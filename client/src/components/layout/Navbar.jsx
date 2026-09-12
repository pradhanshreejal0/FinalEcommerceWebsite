import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, User, Search } from "lucide-react";

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

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/products" },
  { label: "Categories", to: "/categories" },
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight shrink-0 hover:opacity-80 transition"
        >
          YourStore
        </Link>

        {/* Nav links – next to logo */}
        <nav className="hidden md:flex items-center gap-5 ml-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search – center */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 justify-center px-6"
        >
          <div className="flex w-full max-w-md items-center rounded-full border bg-muted/40 overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <div className="pl-4 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button type="submit" size="sm" className="rounded-full m-1 px-4">
              Search
            </Button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            {itemCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                {itemCount}
              </Badge>
            )}
          </Link>

          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
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
                    <Link to="/wishlist">Wishlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-full ml-1">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="mt-6 space-y-6">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center rounded-full border bg-muted/40 overflow-hidden">
                    <div className="pl-3 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products..."
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-3 rounded-full">
                    Search
                  </Button>
                </form>

                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <Separator />

                {user ? (
                  <div className="flex flex-col gap-1">
                    <Link
                      to="/profile"
                      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/orders"
                      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      My Orders
                    </Link>
                    <Button
                      variant="outline"
                      className="mt-2 rounded-full"
                      onClick={logout}
                    >
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
        </div>
      </div>
    </header>
  );
}
