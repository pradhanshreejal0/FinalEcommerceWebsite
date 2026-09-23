// client/src/components/layout/Navbar.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ShoppingBag,
  Menu,
  UserRound,
  Heart,
  Package,
  MessageCircle,
  LogOut,
  ChevronRight,
  ShoppingCart,
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

  /*
  |--------------------------------------------------------------------------
  | LOAD CATEGORIES
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | CATEGORY ICON SCROLL BEHAVIOR
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT DROPDOWN
  |--------------------------------------------------------------------------
  */

  const AccountMenu = ({ mobile = false }) => {
    if (!user) {
      return (
        <Button
          asChild
          size={mobile ? "icon" : "sm"}
          className={
            mobile
              ? "h-9 w-9 rounded-full"
              : "rounded-lg"
          }
          aria-label="Sign in"
          title="Sign in"
        >
          <Link to="/login">
            <UserRound
              className={
                mobile
                  ? "h-5 w-5"
                  : "mr-1.5 h-4 w-4"
              }
            />

            {!mobile && "Sign In"}
          </Link>
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={mobile ? "ghost" : "outline"}
            size="icon"
            className={
              mobile
                ? "h-9 w-9 rounded-full"
                : "h-9 w-9 rounded-full"
            }
            aria-label="Open account menu"
            title="Account"
          >
            <UserRound className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
        >
          <div className="border-b px-3 py-3">
            <p className="truncate text-sm font-semibold">
              {user?.name || "Account"}
            </p>

            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}

            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {user?.role || "customer"}
            </p>
          </div>

          <DropdownMenuItem asChild>
            <Link to="/profile">
              <UserRound className="mr-2 h-4 w-4" />
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
    );
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
        {/* =====================================================
            MAIN NAVBAR
        ===================================================== */}

        <div className="border-b bg-background">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:h-17 lg:gap-5">

            {/* =================================================
                MOBILE MENU
            ================================================= */}

            <Sheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
            >
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
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <ShoppingBag className="h-5 w-5" />
                      </span>

                      <span className="text-xl font-bold tracking-tight">
                        ShopNest
                      </span>
                    </Link>

                    <ThemeToggle />
                  </div>

                  {/* Mobile Search */}

                  <div className="mb-6">
                    <SearchBox
                      variant="mobile"
                      onNavigate={() =>
                        setMobileMenuOpen(false)
                      }
                    />
                  </div>

                  {/* Mobile Navigation */}

                  <div className="space-y-1">
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                    >
                      <span>Home</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                    >
                      <span>Shop</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/categories"
                      onClick={() => setMobileMenuOpen(false)}
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
                            onClick={() =>
                              setMobileMenuOpen(false)
                            }
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
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          <UserRound className="h-4 w-4" />
                          My Profile
                        </Link>

                        <Link
                          to="/orders"
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          <Package className="h-4 w-4" />
                          My Orders
                        </Link>

                        <Link
                          to="/wishlist"
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          <Heart className="h-4 w-4" />
                          Wishlist
                        </Link>

                        <Link
                          to={messagesLink}
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
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
                        <Link
                          to="/login"
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                        >
                          <UserRound className="mr-2 h-4 w-4" />
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
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </span>

              <span className="hidden text-lg font-bold tracking-tight sm:block lg:text-xl">
                ShopNest
              </span>
            </Link>

            {/* =================================================
                SEARCH
            ================================================= */}

            <SearchBox variant="desktop" />

            {/* =================================================
                DESKTOP ACTIONS
            ================================================= */}

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">

              {/* Theme Toggle */}

              <div className="hidden md:block">
                <ThemeToggle className="mr-1" />
              </div>

              {/* Wishlist */}

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden gap-1.5 rounded-lg px-2.5 md:flex"
              >
                <Link to="/wishlist">
                  <Heart className="h-4 w-4" />

                  <span className="hidden lg:inline">
                    Wishlist
                  </span>
                </Link>
              </Button>

              {/* Desktop Cart */}

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="relative hidden gap-1.5 rounded-lg px-2.5 md:flex"
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

              {/* Account / Sign In
                  Always visible on the right side */}

              <AccountMenu mobile />
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

      {/* =======================================================
          MOBILE FLOATING CART
      ======================================================= */}

      <Link
        to="/cart"
        aria-label="Open shopping cart"
        className="fixed bottom-5 right-5 z-60 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background transition-transform duration-200 hover:scale-105 active:scale-95 md:hidden"
      >
        <ShoppingCart className="h-6 w-6" />

        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white shadow-md">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </Link>
    </>
  );
}
