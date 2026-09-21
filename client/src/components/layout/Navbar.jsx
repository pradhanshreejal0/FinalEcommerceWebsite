
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ShoppingCart,
  Menu,
  User,
  Search,
  Heart,
  Package,
  MessageCircle,
  LogOut,
  ChevronRight,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";
import { CategoryIcon } from "../CategoryIcon";

export default function Navbar() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [showCategoryIcons, setShowCategoryIcons] = useState(true);

  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  const navigate = useNavigate();

  const messagesLink =
    user?.role === "vendor" ? "/vendor/chats" : "/chats";

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (e) => {
    e.preventDefault();

    const q = search.trim();

    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/products");
    }
  };

  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await api("/categories");

        if (cancelled) {
          return;
        }

        const parentCategories = data
          .filter((category) => !category.parentCategory)
          .slice(0, 8);

        setCategories(parentCategories);
      } catch (error) {
        console.error("Failed to load categories:", error);

        if (!cancelled) {
          setCategories([]);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // CATEGORY ICON SCROLL BEHAVIOR
  // =========================================================

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setShowCategoryIcons(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY) {
        setShowCategoryIcons(false);
      } else if (currentScrollY < lastScrollY) {
        setShowCategoryIcons(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
      {/* =====================================================
          MAIN NAVBAR
      ===================================================== */}

      <div className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-4 lg:h-17 lg:gap-5">
          {/* =================================================
              MOBILE MENU
          ================================================= */}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-75 sm:w-87"
            >
              <div className="mt-6 flex flex-col">
                {/* Mobile Brand */}

                <div className="mb-6 flex items-center justify-between gap-2">
                  <Link
                    to="/"
                    className="flex items-center gap-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <ShoppingCart className="h-5 w-5" />
                    </span>

                    <span className="text-xl font-bold">
                      YourStore
                    </span>
                  </Link>

                  <ThemeToggle />
                </div>

                {/* Mobile Search */}

                <form
                  onSubmit={handleSearch}
                  className="mb-6"
                >
                  <div className="flex items-center rounded-lg border bg-muted/30 px-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

                    <Input
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search products..."
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 w-full rounded-lg"
                  >
                    Search
                  </Button>
                </form>

                {/* Mobile Navigation */}

                <div className="space-y-1">
                  <Link
                    to="/"
                    className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <span>Home</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/products"
                    className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <span>Shop</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/categories"
                    className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <span>All Categories</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>

                {/* Mobile Categories */}

                {categories.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Popular Categories
                    </p>

                    <div className="space-y-1">
                      {categories.map((cat) => (
                        <Link
                          key={cat._id}
                          to={`/products?category=${cat._id}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
                        >
                          <CategoryIcon
                            category={cat}
                            size="sm"
                          />

                          <span className="text-sm font-medium">
                            {cat.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Account */}

                <div className="mt-6 border-t pt-4">
                  {user ? (
                    <div className="space-y-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                      >
                        <Package className="h-4 w-4" />
                        My Orders
                      </Link>

                      <Link
                        to="/wishlist"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                      >
                        <Heart className="h-4 w-4" />
                        Wishlist
                      </Link>

                      <Link
                        to={messagesLink}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Messages
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Button
                      asChild
                      className="w-full rounded-lg"
                    >
                      <Link to="/login">
                        <User className="mr-2 h-4 w-4" />
                        Sign In
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
            </span>

            <span className="hidden text-lg font-bold tracking-tight sm:block lg:text-xl">
              YourStore
            </span>
          </Link>

          {/* =================================================
              SEARCH
          ================================================= */}

          <form
            onSubmit={handleSearch}
            className="flex min-w-0 flex-1"
          >
            <div className="flex h-10 w-full items-center rounded-lg bg-muted/50 transition focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 sm:h-11">
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground sm:ml-4" />

              <Input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search for products, brands and more"
                className="h-full min-w-0 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 sm:px-3"
              />

              <button
                type="submit"
                className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* =================================================
              DESKTOP ACTIONS
          ================================================= */}

          <div className="hidden items-center gap-2 md:flex">
            {/* Theme Toggle */}

            <ThemeToggle className="mr-1" />

            {/* Wishlist */}

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-lg px-2.5"
            >
              <Link to="/wishlist">
                <Heart className="h-4 w-4" />
                <span className="hidden lg:inline">
                  Wishlist
                </span>
              </Link>
            </Button>

            {/* Cart */}

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="relative gap-1.5 rounded-lg px-2.5"
            >
              <Link to="/cart">
                <ShoppingCart className="h-4 w-4" />

                <span className="hidden lg:inline">
                  Cart
                </span>

                {itemCount > 0 && (
                  <Badge className="absolute -right-1 -top-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                    {itemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* Account */}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden lg:inline">
                      Account
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-52"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/orders">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/wishlist">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to={messagesLink}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-lg"
              >
                <Link to="/login">
                  <User className="mr-1.5 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CATEGORY STRIP
      ===================================================== */}

      {categories.length > 0 && (
        <section className="border-b bg-background">
          <div className="mx-auto max-w-7xl px-3 sm:px-4">
            <div
              className={`scrollbar-hide flex overflow-x-auto transition-all duration-300 ${
                showCategoryIcons
                  ? "gap-5 py-2.5"
                  : "gap-6 py-1.5"
              }`}
            >
              {/* All Categories */}

              <Link
                to="/categories"
                className={`group flex shrink-0 flex-col items-center justify-center transition-all duration-300 ${
                  showCategoryIcons
                    ? "gap-1"
                    : "gap-0"
                }`}
              >
                <div
                  className={`grid overflow-hidden transition-all duration-300 ${
                    showCategoryIcons
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-transform duration-200 group-hover:scale-105">
                      <Menu className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <span className="whitespace-nowrap text-[11px] font-medium">
                  All
                </span>
              </Link>

              {/* Categories */}

              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${cat._id}`}
                  className={`group flex shrink-0 flex-col items-center justify-center transition-all duration-300 ${
                    showCategoryIcons
                      ? "gap-1"
                      : "gap-0"
                  }`}
                >
                  {/* Icon */}

                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                      showCategoryIcons
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="flex h-12 w-12 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <CategoryIcon
                          category={cat}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Name */}

                  <span className="max-w-20 truncate whitespace-nowrap text-[11px] font-medium text-foreground/80 group-hover:text-foreground">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </header>
  );
}
