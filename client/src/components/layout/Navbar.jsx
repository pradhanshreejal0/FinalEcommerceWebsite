
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import {
  ShoppingCart,
  Menu,
  User,
  Search,
  MessageCircle,
  Heart,
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

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";
import { CategoryIcon } from "../CategoryIcon";

const navLinks = [
  {
    label: "Home",
    to: "/",
  },
  {
    label: "Shop",
    to: "/products",
    badge: {
      text: "Hot",
      variant: "hot",
    },
  },
  {
    label: "Categories",
    to: "/categories",
  },
];

export default function Navbar() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  // Controls whether category icons are visible
  const [showCategoryIcons, setShowCategoryIcons] = useState(true);

  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();

  const category = searchParams.get("category") || "";

  const messagesLink =
    user?.role === "vendor" ? "/vendor/chats" : "/chats";

  // ==================================================
  // SEARCH
  // ==================================================

  const handleSearch = (e) => {
    e.preventDefault();

    const q = search.trim();

    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/products");
    }
  };

  // ==================================================
  // CATEGORY FILTER
  // ==================================================

  const updateCategory = (value) => {
    if (value) {
      navigate(`/products?category=${value}`);
    } else {
      navigate("/products");
    }
  };

  // ==================================================
  // LOAD CATEGORIES
  // ==================================================

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

  // ==================================================
  // CATEGORY ICON SCROLL BEHAVIOR
  // ==================================================

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show icons when at the top
      if (currentScrollY <= 10) {
        setShowCategoryIcons(true);
        lastScrollY = currentScrollY;
        return;
      }

      // Scrolling DOWN
      if (currentScrollY > lastScrollY) {
        setShowCategoryIcons(false);
      }

      // Scrolling UP
      else if (currentScrollY < lastScrollY) {
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

  // ==================================================
  // ACTIVE NAVIGATION
  // ==================================================

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  // ==================================================
  // JSX
  // ==================================================

  return (
    <header className="sticky top-0 z-50 w-full bg-background mb-4">

      {/* ==================================================
          TOP BAR
      ================================================== */}

      <div className="bg-muted/40 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">

          {/* ==================================================
              MOBILE MENU
          ================================================== */}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-80"
            >
              <div className="mt-6 space-y-6">

                {/* Mobile Search */}

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

                  <Button
                    type="submit"
                    className="w-full mt-3 rounded-full"
                  >
                    Search
                  </Button>
                </form>

                {/* Mobile Navigation */}

                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(link.to)
                          ? "bg-muted text-foreground"
                          : "hover:bg-muted"
                      }`}
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

                {/* Mobile Account */}

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

                    <Link
                      to="/wishlist"
                      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Wishlist
                    </Link>

                    <Link
                      to={messagesLink}
                      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Messages
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
                  <Button
                    asChild
                    className="rounded-full"
                  >
                    <Link to="/login">
                      Login
                    </Link>
                  </Button>
                )}

              </div>
            </SheetContent>
          </Sheet>

          {/* ==================================================
              LOGO
          ================================================== */}

          <Link
            to="/"
            className="hidden lg:flex items-center gap-2 shrink-0 hover:opacity-80 transition"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
            </span>

            <span className="text-xl font-bold tracking-tight">
              YourStore
            </span>
          </Link>

          {/* ==================================================
              SEARCH
          ================================================== */}

          <form
            onSubmit={handleSearch}
            className="flex flex-1 justify-center"
          >
            <div className="flex w-full max-w-md items-center rounded-full border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
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

          {/* ==================================================
              DESKTOP ACTIONS
          ================================================== */}

          <div className="hidden md:flex items-center gap-2 shrink-0">

            {/* Wishlist */}

            <Link to="/wishlist">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Button>
            </Link>

            {/* Cart */}

            <Link
              to="/cart"
              className="relative"
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
              >
                <ShoppingCart className="h-4 w-4" />
                Cart
              </Button>

              {itemCount > 0 && (
                <Badge
                  className="absolute -top-1.5 -right-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
                >
                  {itemCount}
                </Badge>
              )}
            </Link>

            {/* Account */}

            {user ? (
              <DropdownMenu>

                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5"
                  >
                    <User className="h-4 w-4" />
                    Account
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-44"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      My Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/orders">
                      My Orders
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/wishlist">
                      Wishlist
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to={messagesLink}>
                      Messages
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={logout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>

              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-full gap-1.5"
              >
                <Link to="/login">
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* ==================================================
          CATEGORY / NAVIGATION BAR
      ================================================== */}

      <div className="hidden lg:block border-b bg-background">

        <div className="mx-auto flex h-12 max-w-7xl items-center justify-center px-4">

          <div className="flex items-center justify-between gap-6">

            {/* Category Select */}

            <Select
              value={category || "all"}
              onValueChange={(value) =>
                updateCategory(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">
                  All categories
                </SelectItem>

                {categories.map((parent) => (
                  <SelectItem
                    key={parent._id}
                    value={parent._id}
                  >
                    {parent.name}
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>

            {/* Navigation */}

            <nav className="flex items-center gap-5">

              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "text-foreground"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
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

              {/* Messages */}

              {user && (
                <Link
                  to={messagesLink}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Link>
              )}

            </nav>

          </div>
        </div>
      </div>

      {/* ==================================================
          CATEGORY CIRCLES
          SCROLL DOWN  -> ICONS HIDE
          SCROLL UP    -> ICONS SHOW
      ================================================== */}

      {categories.length > 0 && (
        <section className="border-b border-black/10 bg-white">

          <div className="mx-auto max-w-7xl px-4 py-2">

            <div
              className={`flex gap-5 overflow-x-auto scrollbar-hide transition-all duration-300 ${
                showCategoryIcons
                  ? "py-1"
                  : "py-0"
              }`}
            >

              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${cat._id}`}
                  className={`group flex min-w-16 flex-col items-center transition-all duration-300 ${
                    showCategoryIcons
                      ? "gap-1"
                      : "gap-0"
                  }`}
                >

                  {/* ========================================
                      CATEGORY ICON
                  ======================================== */}

                  <div
                    className={`grid w-full overflow-hidden transition-all duration-300 ease-in-out ${
                      showCategoryIcons
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0">

                      <div className="flex justify-center transition-transform duration-300 group-hover:scale-105">

                        <CategoryIcon
                          category={cat}
                          size="sm"
                        />

                      </div>

                    </div>
                  </div>

                  {/* ========================================
                      CATEGORY NAME
                  ======================================== */}

                  <span className="max-w-16 text-center text-[11px] font-medium line-clamp-1">
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
