import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  ShoppingCart,
  Menu,
  User,
  UserCircle2,
  Heart,
  Package,
  MessageCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import SearchBox from "@/components/SearchBox";

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
  const [showCategoryIcons, setShowCategoryIcons] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  const messagesLink =
    user?.role === "vendor" ? "/vendor/chats" : "/chats";

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
  // Shows instantly on any upward scroll; only hides after
  // 40px of sustained downward scroll (avoids flicker from
  // momentum bounce / tiny back-and-forth jitter).
  // =========================================================

  useEffect(() => {
    let lastScrollY = Math.max(window.scrollY, 0);
    let downAccum = 0;
    let ticking = false;

    const HIDE_AFTER = 10; // px of sustained downward scroll before hiding

    const updateScrollDirection = () => {
      // Clamp to guard against iOS/Android overscroll bounce reporting
      // negative or out-of-range values, which was a source of flicker.
      const currentScrollY = Math.max(window.scrollY, 0);

      if (currentScrollY <= 10) {
        setShowCategoryIcons((prev) => (prev ? prev : true));
        lastScrollY = currentScrollY;
        downAccum = 0;
        ticking = false;
        return;
      }

      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (delta < 0) {
        // Any upward scroll reveals it immediately.
        downAccum = 0;
        setShowCategoryIcons((prev) => (prev ? prev : true));
      } else if (delta > 0) {
        // Downward scroll needs to accumulate past the threshold
        // before hiding, so brief/jittery downward blips don't hide it.
        downAccum += delta;

        if (downAccum > HIDE_AFTER) {
          setShowCategoryIcons((prev) => (prev ? false : prev));
        }
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
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

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
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
                    <div className="space-y-2">
                      <Button
                        asChild
                        className="w-full rounded-lg"
                      >
                        <Link to="/login">
                          <User className="mr-2 h-4 w-4" />
                          Sign In
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-lg"
                      >
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </div>
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
              SEARCH (desktop only — mobile has its own row below)
          ================================================= */}

          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBox variant="desktop" />
          </div>

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

            {/* Account / Auth */}

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
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                >
                  <Link to="/login">Sign In</Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="rounded-lg"
                >
                  <Link to="/register">
                    <User className="mr-1.5 h-4 w-4" />
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* =================================================
              MOBILE ACTIONS (right side, next to hamburger/logo)
          ================================================= */}

          <div className="ml-auto flex items-center gap-1.5 md:hidden">
            <ThemeToggle />

            {user ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Account"
              >
                <Link to="/profile">
                  <UserCircle2 className="h-6 w-6" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-lg"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          MOBILE SEARCH ROW
      ===================================================== */}

      <div className="border-b bg-background px-3 py-2 sm:px-4 md:hidden">
        <SearchBox variant="mobile" />
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
                className={`group  flex shrink-0 flex-col items-center justify-center transition-all duration-300 ${
                  showCategoryIcons
                    ? "gap-1"
                    : "gap-0"
                }`}
              >
                <div
                  className={`grid overflow-hidden transition-all duration-300  ${
                    showCategoryIcons
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-transform duration-200 group-hover:scale-105">
                      <Menu className="h-5 w-5 " />
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
                        ? "grid-rows-[1fr]  opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 ">
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

      {/* =====================================================
          FLOATING MOBILE CART BUTTON
      ===================================================== */}

      <Link
        to="/cart"
        aria-label="View cart"
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <ShoppingCart className="h-6 w-6" />

        {itemCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full border-2 border-background px-1 text-[10px]">
            {itemCount}
          </Badge>
        )}
      </Link>
    </header>
  );
}
