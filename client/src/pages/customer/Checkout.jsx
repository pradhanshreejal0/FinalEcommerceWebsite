import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFinalPrice } from "@/lib/utils";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

/* ============================================================
   LEAFLET ICON FIX
============================================================ */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_MAP_POSITION = {
  lat: 27.7172,
  lng: 85.324,
};

const DEFAULT_ZOOM = 13;

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search";

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(
      [location.lat, location.lng],
      Math.max(map.getZoom(), 16),
      {
        duration: 0.8,
      }
    );
  }, [location, map]);

  return null;
}

/* ============================================================
   LOCATION SELECTOR
============================================================ */

function LocationSelector({
  location,
  setLocation,
  disabled = false,
}) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }

      const { lat, lng } = event.latlng;

      setLocation({
        lat,
        lng,
      });
    },
  });

  if (!location) {
    return null;
  }

  return (
    <Marker
      position={[location.lat, location.lng]}
      draggable={!disabled}
      eventHandlers={{
        dragend(event) {
          if (disabled) {
            return;
          }

          const marker = event.target;
          const newPosition = marker.getLatLng();

          setLocation({
            lat: newPosition.lat,
            lng: newPosition.lng,
          });
        },
      }}
    >
      <Popup>
        <div className="min-w-45 text-sm">
          <p className="font-semibold">
            Delivery Location
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Latitude: {location.lat.toFixed(6)}
          </p>

          <p className="text-xs text-muted-foreground">
            Longitude: {location.lng.toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

/* ============================================================
   CHECKOUT
============================================================ */

export default function Checkout() {
  const navigate = useNavigate();

  const {
    user,
    accessToken,
  } = useAuth();

  const {
    cart,
    loading: cartLoading,
    resetCart,
  } = useCart();

  /* ============================================================
     AUTH STATE
  ============================================================ */

  /*
   * Important:
   *
   * We do NOT immediately redirect when user is falsy.
   *
   * Some AuthContext implementations start with:
   *
   *     user = null
   *
   * while they are checking the existing session.
   *
   * Redirecting immediately can therefore send the customer
   * to /login while checkout is still loading.
   */

  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecking(false);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (authChecking) {
      return;
    }

    if (!user) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    if (user.role !== "customer") {
      navigate("/", {
        replace: true,
      });
    }
  }, [
    authChecking,
    user,
    navigate,
  ]);

  /* ============================================================
     SHIPPING FORM
  ============================================================ */

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Nepal",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      fullName:
        previous.fullName ||
        user.name ||
        "",
    }));
  }, [user]);

  /* ============================================================
     LOCATION
  ============================================================ */

  const [location, setLocation] = useState(null);

  /* ============================================================
     SEARCH
  ============================================================ */

  const [searchQuery, setSearchQuery] = useState("");

  const [
    searchResults,
    setSearchResults,
  ] = useState([]);

  const [
    searchingLocation,
    setSearchingLocation,
  ] = useState(false);

  const [
    showSearchResults,
    setShowSearchResults,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState("");

  /* ============================================================
     PAYMENT
  ============================================================ */

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cod");

  /* ============================================================
     DELIVERY QUOTE
  ============================================================ */

  const [
    deliveryQuote,
    setDeliveryQuote,
  ] = useState(null);

  const [
    calculatingDelivery,
    setCalculatingDelivery,
  ] = useState(false);

  /* ============================================================
     SUBMIT
  ============================================================ */

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* ============================================================
     CART ITEMS
  ============================================================ */

  const items = useMemo(
    () => cart?.items || [],
    [cart]
  );

  /* ============================================================
     FORM CHANGE
  ============================================================ */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* ============================================================
     SUBTOTAL
  ============================================================ */

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => {
        if (!item?.product) {
          return sum;
        }

        const price = Number(
          getFinalPrice(item.product) || 0
        );

        const quantity = Number(
          item.quantity || 0
        );

        return (
          sum +
          price * quantity
        );
      },
      0
    );
  }, [items]);

  /* ============================================================
     ITEM COUNT
  ============================================================ */

  const itemCount = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        Number(item?.quantity || 0),
      0
    );
  }, [items]);

  /* ============================================================
     DELIVERY FEE
  ============================================================ */

  const deliveryFee = Number(
    deliveryQuote?.deliveryFee || 0
  );

  /* ============================================================
     GRAND TOTAL
  ============================================================ */

  const grandTotal =
    subtotal +
    deliveryFee;

  /* ============================================================
     SEARCH LOCATION
  ============================================================ */

  const searchLocation = async () => {
    const query =
      searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchError(
        "Enter a place name or landmark."
      );
      setShowSearchResults(true);
      return;
    }

    try {
      setSearchingLocation(true);
      setSearchError("");
      setShowSearchResults(true);

      const params =
        new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "5",
          countrycodes: "np",
        });

      const response =
        await fetch(
          `${NOMINATIM_URL}?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "Location search failed."
        );
      }

      const results =
        await response.json();

      if (
        !Array.isArray(results) ||
        results.length === 0
      ) {
        setSearchResults([]);
        setSearchError(
          "No location found. Try a nearby landmark, street, or place name."
        );

        return;
      }

      setSearchResults(results);
    } catch (err) {
      console.error(
        "Location search error:",
        err
      );

      setSearchResults([]);

      setSearchError(
        err?.message ||
          "Unable to search for this location."
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  /* ============================================================
     SEARCH KEY DOWN
  ============================================================ */

  const handleSearchKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      searchLocation();
    }
  };

  /* ============================================================
     SELECT SEARCH RESULT
  ============================================================ */

  const selectSearchResult = (
    result
  ) => {
    const lat =
      Number(result.lat);

    const lng =
      Number(result.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    setLocation({
      lat,
      lng,
    });

    const address =
      result.address || {};

    const displayName =
      result.display_name || "";

    /*
     * Automatically fill address fields when
     * Nominatim provides them.
     */

    const road =
      address.road ||
      address.pedestrian ||
      address.footway ||
      "";

    const houseNumber =
      address.house_number ||
      "";

    const neighbourhood =
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      "";

    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      "";

    const postcode =
      address.postcode ||
      "";

    let generatedAddress = "";

    if (
      houseNumber ||
      road
    ) {
      generatedAddress = [
        houseNumber,
        road,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (neighbourhood) {
      generatedAddress = [
        generatedAddress,
        neighbourhood,
      ]
        .filter(Boolean)
        .join(", ");
    }

    if (!generatedAddress) {
      generatedAddress =
        displayName;
    }

    setForm((previous) => ({
      ...previous,

      address:
        generatedAddress ||
        previous.address,

      city:
        city ||
        previous.city,

      postalCode:
        postcode ||
        previous.postalCode,

      country:
        "Nepal",
    }));

    setSearchQuery(
      displayName
    );

    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError("");
    setError("");
  };

  /* ============================================================
     CLEAR SEARCH
  ============================================================ */

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowSearchResults(false);
  };

  /* ============================================================
     DELIVERY QUOTE
  ============================================================ */

  useEffect(() => {
    if (
      !location ||
      items.length === 0
    ) {
      setDeliveryQuote(null);
      setCalculatingDelivery(false);
      return;
    }

    /*
     * Do not call the delivery endpoint until
     * authentication has finished loading.
     */

    if (!accessToken) {
      setDeliveryQuote(null);
      setCalculatingDelivery(false);

      return;
    }

    let cancelled = false;

    const fetchDeliveryQuote =
      async () => {
        try {
          setCalculatingDelivery(
            true
          );

          setDeliveryQuote(null);

          /*
           * IMPORTANT:
           *
           * If this request returns 401, the checkout
           * should show the error instead of blindly
           * navigating to /login.
           */

          const quote =
            await api(
              "/orders/delivery-quote",
              {
                method: "POST",
                accessToken,

                body: JSON.stringify({
                  latitude:
                    location.lat,

                  longitude:
                    location.lng,
                }),
              }
            );

          if (cancelled) {
            return;
          }

          if (!quote) {
            throw new Error(
              "The server did not return a delivery quote."
            );
          }

          setDeliveryQuote(
            quote
          );

          setError("");
        } catch (err) {
          console.error(
            "Delivery quote error:",
            err
          );

          if (cancelled) {
            return;
          }

          setDeliveryQuote(null);

          /*
           * Do not call navigate("/login") here.
           *
           * This is important because a delivery quote
           * failure should not automatically destroy
           * the checkout session.
           */

          setError(
            err?.message ||
              "Unable to calculate delivery fee."
          );
        } finally {
          if (!cancelled) {
            setCalculatingDelivery(
              false
            );
          }
        }
      };

    fetchDeliveryQuote();

    return () => {
      cancelled = true;
    };
  }, [
    location,
    accessToken,
    items.length,
  ]);

  /* ============================================================
     SUBMIT ORDER
  ============================================================ */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      /* --------------------------------------------------------
         AUTH
      -------------------------------------------------------- */

      if (!user) {
        setError(
          "Your session has expired. Please login again."
        );

        return;
      }

      if (!accessToken) {
        setError(
          "Your session is still loading. Please wait a moment and try again."
        );

        return;
      }

      /* --------------------------------------------------------
         CART
      -------------------------------------------------------- */

      if (items.length === 0) {
        setError(
          "Your cart is empty."
        );

        return;
      }

      /* --------------------------------------------------------
         FULL NAME
      -------------------------------------------------------- */

      if (
        !form.fullName.trim()
      ) {
        setError(
          "Please enter your full name."
        );

        return;
      }

      /* --------------------------------------------------------
         PHONE
      -------------------------------------------------------- */

      if (!form.phone.trim()) {
        setError(
          "Please enter your phone number."
        );

        return;
      }

      /* --------------------------------------------------------
         ADDRESS
      -------------------------------------------------------- */

      if (
        !form.address.trim()
      ) {
        setError(
          "Please enter your address."
        );

        return;
      }

      /* --------------------------------------------------------
         CITY
      -------------------------------------------------------- */

      if (!form.city.trim()) {
        setError(
          "Please enter your city."
        );

        return;
      }

      /* --------------------------------------------------------
         COUNTRY
      -------------------------------------------------------- */

      if (
        !form.country.trim()
      ) {
        setError(
          "Please enter your country."
        );

        return;
      }

      /* --------------------------------------------------------
         LOCATION
      -------------------------------------------------------- */

      if (!location) {
        setError(
          "Please search for your location or click on the map."
        );

        return;
      }

      /* --------------------------------------------------------
         DELIVERY
      -------------------------------------------------------- */

      if (calculatingDelivery) {
        setError(
          "Please wait while the delivery fee is calculated."
        );

        return;
      }

      if (!deliveryQuote) {
        setError(
          "Please select a delivery location and wait for the delivery fee."
        );

        return;
      }

      /* --------------------------------------------------------
         PAYMENT
      -------------------------------------------------------- */

      if (
        paymentMethod !== "cod"
      ) {
        setError(
          "Online payment is not available yet. Please select Cash on Delivery."
        );

        return;
      }

      /* --------------------------------------------------------
         PLACE ORDER
      -------------------------------------------------------- */

      try {
        setSubmitting(true);

        const order =
          await api(
            "/orders",
            {
              method: "POST",
              accessToken,

              body: JSON.stringify({
                shippingAddress: {
                  fullName:
                    form.fullName.trim(),

                  phone:
                    form.phone.trim(),

                  address:
                    form.address.trim(),

                  city:
                    form.city.trim(),

                  postalCode:
                    form.postalCode.trim(),

                  country:
                    form.country.trim(),

                  latitude:
                    location.lat,

                  longitude:
                    location.lng,
                },

                paymentMethod,
              }),
            }
          );

        if (!order?._id) {
          throw new Error(
            "Order was created, but the order ID was not returned."
          );
        }

        resetCart();

        navigate(
          `/orders/${order._id}`,
          {
            replace: true,
          }
        );
      } catch (err) {
        console.error(
          "Place order error:",
          err
        );

        setError(
          err?.message ||
            "Unable to place your order. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* ============================================================
     LOADING
  ============================================================ */

  if (
    authChecking ||
    cartLoading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />

          <span>
            Loading checkout...
          </span>
        </div>
      </div>
    );
  }

  /* ============================================================
     NOT AUTHENTICATED
  ============================================================ */

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />

          <p className="mt-3 text-sm text-muted-foreground">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  /* ============================================================
     EMPTY CART
  ============================================================ */

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-bold">
            Your cart is empty
          </h1>

          <p className="mt-2 text-muted-foreground">
            Add some products before
            going to checkout.
          </p>

          <Button
            asChild
            className="mt-6"
          >
            <Link to="/products">
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-3"
            onClick={() =>
              navigate("/cart")
            }
            disabled={submitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Back to Cart
          </Button>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Checkout
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Enter your delivery information,
            choose your location, and review
            your delivery fee.
          </p>
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ==================================================
                LEFT
            ================================================== */}

            <div className="space-y-6 lg:col-span-2">

              {/* ==================================================
                  SHIPPING ADDRESS
              ================================================== */}

              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Shipping Address
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Where should we deliver
                    your order?
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Full Name */}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Full Name
                    </label>

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Phone */}

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Phone Number
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="98XXXXXXXX"
                      autoComplete="tel"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* City */}

                  <div>
                    <label
                      htmlFor="city"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      City
                    </label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Kathmandu"
                      autoComplete="address-level2"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Address */}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Address
                    </label>

                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Street, house number, area..."
                      autoComplete="street-address"
                      disabled={submitting}
                      className="w-full resize-none rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Postal Code */}

                  <div>
                    <label
                      htmlFor="postalCode"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Postal Code
                      <span className="ml-1 font-normal text-muted-foreground">
                        (Optional)
                      </span>
                    </label>

                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="44600"
                      autoComplete="postal-code"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Country */}

                  <div>
                    <label
                      htmlFor="country"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Country
                    </label>

                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="Nepal"
                      autoComplete="country-name"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>
              </section>

              {/* ==================================================
                  DELIVERY LOCATION
              ================================================== */}

              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />

                    <h2 className="text-lg font-semibold">
                      Delivery Location
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Search for a place or landmark,
                    select a result, or click directly
                    on the map.
                  </p>
                </div>

                {/* ==================================================
                    SEARCH
                ================================================== */}

                <div className="relative z-1000">

                  <div className="flex gap-2">

                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(
                            event.target.value
                          );

                          setSearchError("");

                          if (
                            event.target.value.trim()
                          ) {
                            setShowSearchResults(
                              true
                            );
                          }
                        }}
                        onKeyDown={
                          handleSearchKeyDown
                        }
                        onFocus={() => {
                          if (
                            searchResults.length > 0
                          ) {
                            setShowSearchResults(
                              true
                            );
                          }
                        }}
                        placeholder="Search place or landmark..."
                        disabled={submitting}
                        className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={
                        searchLocation
                      }
                      disabled={
                        searchingLocation ||
                        submitting
                      }
                    >
                      {searchingLocation ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}

                      Search
                    </Button>
                  </div>

                  {/* Search Examples */}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "Boudhanath Stupa",
                      "Thamel",
                      "Patan Durbar Square",
                      "Kathmandu Mall",
                    ].map(
                      (example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setSearchQuery(
                              example
                            );

                            setTimeout(
                              () => {
                                searchLocation();
                              },
                              0
                            );
                          }}
                          className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          {example}
                        </button>
                      )
                    )}
                  </div>

                  {/* Search Results */}

                  {showSearchResults && (
                    <div className="absolute left-0 right-0 top-full z-2000 mt-2 overflow-hidden rounded-lg border bg-background shadow-xl">

                      {searchingLocation && (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />

                          Searching locations...
                        </div>
                      )}

                      {!searchingLocation &&
                        searchError && (
                          <div className="px-4 py-3 text-sm text-destructive">
                            {searchError}
                          </div>
                        )}

                      {!searchingLocation &&
                        !searchError &&
                        searchResults.length >
                          0 && (
                          <div className="max-h-72 overflow-y-auto">

                            {searchResults.map(
                              (
                                result,
                                index
                              ) => (
                                <button
                                  key={`${result.place_id}-${index}`}
                                  type="button"
                                  onClick={() =>
                                    selectSearchResult(
                                      result
                                    )
                                  }
                                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                                >
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                      {result.name ||
                                        result.display_name?.split(
                                          ","
                                        )[0] ||
                                        "Location"}
                                    </p>

                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {
                                        result.display_name
                                      }
                                    </p>
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* ==================================================
                    MAP
                ================================================== */}

                <div className="relative z-0 mt-5 overflow-hidden rounded-xl border">

                  <MapContainer
                    center={[
                      DEFAULT_MAP_POSITION.lat,
                      DEFAULT_MAP_POSITION.lng,
                    ]}
                    zoom={DEFAULT_ZOOM}
                    scrollWheelZoom
                    className="w-full"
                    style={{
                      height: "400px",
                      width: "100%",
                    }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapController
                      location={location}
                    />

                    <LocationSelector
                      location={location}
                      setLocation={
                        setLocation
                      }
                      disabled={
                        submitting
                      }
                    />
                  </MapContainer>
                </div>

                {/* ==================================================
                    LOCATION INFO
                ================================================== */}

                <div className="mt-4">

                  {location ? (
                    <div className="rounded-lg border bg-muted/40 p-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-medium">
                            Delivery location selected
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Latitude:{" "}
                            {location.lat.toFixed(
                              6
                            )}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Longitude:{" "}
                            {location.lng.toFixed(
                              6
                            )}
                          </p>

                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center">

                      <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />

                      <p className="mt-2 text-sm font-medium">
                        Select your delivery location
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Search for a place, select
                        a result, or click the map.
                      </p>

                    </div>
                  )}

                </div>

                {/* ==================================================
                    DELIVERY FEE
                ================================================== */}

                {location && (
                  <div className="mt-4 rounded-lg border bg-background p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-medium">
                          Delivery fee
                        </p>

                        {calculatingDelivery ? (
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />

                            Calculating delivery
                            distance and fee...
                          </div>
                        ) : deliveryQuote ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Delivery from{" "}
                            {
                              deliveryQuote
                                ?.delivery
                                ?.vendors
                                ?.length || 0
                            }{" "}
                            vendor
                            {(
                              deliveryQuote
                                ?.delivery
                                ?.vendors
                                ?.length || 0
                            ) !== 1
                              ? "s"
                              : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-destructive">
                            Unable to calculate
                            delivery fee.
                          </p>
                        )}

                      </div>

                      <div className="text-right">

                        {calculatingDelivery ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : deliveryQuote ? (
                          <span className="font-semibold">
                            NPR{" "}
                            {deliveryFee.toFixed(
                              2
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}

                      </div>
                    </div>

                    {/* Vendor Breakdown */}

                    {deliveryQuote
                      ?.delivery
                      ?.vendors
                      ?.length > 0 && (
                      <div className="mt-4 border-t pt-4">

                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Delivery breakdown
                        </p>

                        <div className="space-y-2">

                          {deliveryQuote.delivery.vendors.map(
                            (
                              vendorDelivery,
                              index
                            ) => (
                              <div
                                key={
                                  vendorDelivery
                                    .vendor
                                    ?._id ||
                                  index
                                }
                                className="flex items-center justify-between gap-3 text-sm"
                              >

                                <div className="min-w-0">

                                  <p className="truncate font-medium">
                                    {vendorDelivery
                                      .vendor
                                      ?.storeName ||
                                      `Vendor ${
                                        index +
                                        1
                                      }`}
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    {Number(
                                      vendorDelivery.distanceKm ||
                                        0
                                    ).toFixed(
                                      2
                                    )}{" "}
                                    km away
                                  </p>

                                </div>

                                <span className="shrink-0 font-medium">
                                  NPR{" "}
                                  {Number(
                                    vendorDelivery.fee ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </span>

                              </div>
                            )
                          )}

                        </div>
                      </div>
                    )}

                  </div>
                )}
              </section>

              {/* ==================================================
                  PAYMENT
              ================================================== */}

              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <div className="mb-6">

                  <h2 className="text-lg font-semibold">
                    Payment Method
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Select your preferred
                    payment method.
                  </p>

                </div>

                <div className="space-y-3">

                  {/* COD */}

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >

                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={
                        paymentMethod ===
                        "cod"
                      }
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value
                        )
                      }
                      disabled={
                        submitting
                      }
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Pay when your order
                        arrives.
                      </p>
                    </div>

                  </label>

                  {/* Stripe */}

                  <div className="flex items-start gap-3 rounded-lg border p-4 opacity-60">

                    <input
                      type="radio"
                      disabled
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Stripe
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Online card payment —
                        coming soon.
                      </p>
                    </div>

                  </div>

                  {/* Razorpay */}

                  <div className="flex items-start gap-3 rounded-lg border p-4 opacity-60">

                    <input
                      type="radio"
                      disabled
                      className="mt-1"
                    />

                    <div>
                      <p className="font-medium">
                        Razorpay
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Online payment —
                        coming soon.
                      </p>
                    </div>

                  </div>

                </div>
              </section>
            </div>

            {/* ==================================================
                ORDER SUMMARY
            ================================================== */}

            <aside className="lg:col-span-1">

              <div className="sticky top-6 rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <h2 className="text-lg font-semibold">
                  Order Summary
                </h2>

                {/* Items */}

                <div className="mt-5 space-y-4">

                  {items.map(
                    (item) => {
                      const product =
                        item?.product;

                      if (!product) {
                        return null;
                      }

                      const image =
                        product.images?.[0] ||
                        "";

                      const price =
                        Number(
                          getFinalPrice(
                            product
                          ) || 0
                        );

                      const quantity =
                        Number(
                          item.quantity ||
                            0
                        );

                      const itemSubtotal =
                        price *
                        quantity;

                      return (
                        <div
                          key={
                            product._id
                          }
                          className="flex gap-3"
                        >

                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">

                            {image ? (
                              <img
                                src={image}
                                alt={
                                  product.title
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="line-clamp-2 text-sm font-medium">
                              {
                                product.title
                              }
                            </p>

                            {product.vendor
                              ?.storeName && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {
                                  product
                                    .vendor
                                    .storeName
                                }
                              </p>
                            )}

                            <div className="mt-1 flex items-center justify-between gap-2">

                              <span className="text-xs text-muted-foreground">
                                Qty:{" "}
                                {
                                  quantity
                                }
                              </span>

                              <span className="text-sm font-medium">
                                NPR{" "}
                                {itemSubtotal.toFixed(
                                  2
                                )}
                              </span>

                            </div>

                          </div>
                        </div>
                      );
                    }
                  )}

                </div>

                <div className="my-5 border-t" />

                {/* Items */}

                <div className="flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Items
                  </span>

                  <span>
                    {itemCount}
                  </span>

                </div>

                {/* Subtotal */}

                <div className="mt-3 flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span>
                    NPR{" "}
                    {subtotal.toFixed(
                      2
                    )}
                  </span>

                </div>

                {/* Delivery */}

                <div className="mt-3 flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Delivery
                  </span>

                  <span>

                    {calculatingDelivery ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />

                        Calculating...
                      </span>
                    ) : deliveryQuote ? (
                      `NPR ${deliveryFee.toFixed(
                        2
                      )}`
                    ) : (
                      "Select location"
                    )}

                  </span>
                </div>

                <div className="my-5 border-t" />

                {/* Total */}

                <div className="flex items-center justify-between">

                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-xl font-bold">
                    NPR{" "}
                    {grandTotal.toFixed(
                      2
                    )}
                  </span>

                </div>

                {/* Place Order */}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={
                    submitting ||
                    calculatingDelivery ||
                    !deliveryQuote
                  }
                >

                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                      Placing Order...
                    </>
                  ) : calculatingDelivery ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                      Calculating Delivery...
                    </>
                  ) : !location ? (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />

                      Select Location
                    </>
                  ) : !deliveryQuote ? (
                    <>
                      <Truck className="mr-2 h-4 w-4" />

                      Calculate Delivery
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />

                      Place Order
                    </>
                  )}

                </Button>

                {/* Return */}

                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    navigate("/cart")
                  }
                  disabled={
                    submitting
                  }
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />

                  Return to Cart
                </Button>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Your order will be placed
                  using Cash on Delivery.
                </p>

              </div>
            </aside>

          </div>
        </form>
      </div>
    </div>
  );
}
