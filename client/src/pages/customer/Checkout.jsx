import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFinalPrice } from "@/lib/utils";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LocateFixed,
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

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;

    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 16), {
      duration: 0.8,
    });
  }, [location, map]);

  return null;
}

/* ============================================================
   LOCATION SELECTOR
============================================================ */

function LocationSelector({ location, setLocation, disabled = false }) {
  useMapEvents({
    click(event) {
      if (disabled) return;
      const { lat, lng } = event.latlng;
      setLocation({ lat, lng });
    },
  });

  if (!location) return null;

  return (
    <Marker
      position={[location.lat, location.lng]}
      draggable={!disabled}
      eventHandlers={{
        dragend(event) {
          if (disabled) return;
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
          <p className="font-semibold">Delivery Location</p>
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
  const { user, accessToken } = useAuth();
  const { cart, loading: cartLoading, resetCart } = useCart();

  const [authChecking, setAuthChecking] = useState(true);
  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Nepal",
  });

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => cart?.items || [], [cart]);

  // Auth check
  useEffect(() => {
    const timer = setTimeout(() => setAuthChecking(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authChecking) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "customer") {
      navigate("/", { replace: true });
    }
  }, [authChecking, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.name || "",
    }));
  }, [user]);

  // ========== AUTO LOCATE ON PAGE LOAD ==========
  useEffect(() => {
    // Only try once when component mounts
    if (!navigator.geolocation) return;

    // Check if permission is already granted
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          // Automatically get location if already allowed
          useCurrentLocation(true); // silent = true
        }
      })
      .catch(() => {
        // permissions API not supported → do nothing
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item?.product) return sum;
      const price = Number(getFinalPrice(item.product) || 0);
      const quantity = Number(item.quantity || 0);
      return sum + price * quantity;
    }, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  }, [items]);

  const deliveryFee = Number(deliveryQuote?.deliveryFee || 0);
  const grandTotal = subtotal + deliveryFee;

  /* ============================================================
     SEARCH LOCATION
  ============================================================ */
  const searchLocation = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("Enter a place name or landmark.");
      setShowSearchResults(true);
      return;
    }

    try {
      setSearchingLocation(true);
      setSearchError("");
      setShowSearchResults(true);

      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "np",
      });

      const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "MarketplaceApp/1.0",
        },
      });

      if (!response.ok) throw new Error("Location search failed.");

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        setSearchResults([]);
        setSearchError(
          "No location found. Try a nearby landmark, street, or place name."
        );
        return;
      }

      setSearchResults(results);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
      setSearchError(err?.message || "Unable to search for this location.");
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchLocation();
    }
  };

  /* ============================================================
     SELECT SEARCH RESULT
  ============================================================ */
  const selectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLocation({ lat, lng });

    const address = result.address || {};
    const displayName = result.display_name || "";

    const road = address.road || address.pedestrian || address.footway || "";
    const houseNumber = address.house_number || "";
    const neighbourhood =
      address.neighbourhood || address.suburb || address.quarter || "";
    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      "";
    const postcode = address.postcode || "";

    let generatedAddress = "";
    if (houseNumber || road) {
      generatedAddress = [houseNumber, road].filter(Boolean).join(" ");
    }
    if (neighbourhood) {
      generatedAddress = [generatedAddress, neighbourhood]
        .filter(Boolean)
        .join(", ");
    }
    if (!generatedAddress) generatedAddress = displayName;

    setForm((prev) => ({
      ...prev,
      address: generatedAddress || prev.address,
      city: city || prev.city,
      postalCode: postcode || prev.postalCode,
      country: "Nepal",
    }));

    setSearchQuery(displayName);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError("");
    setError("");
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowSearchResults(false);
  };

  /* ============================================================
     USE CURRENT LOCATION (FIXED)
  ============================================================ */
  const useCurrentLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) {
        setSearchError("Geolocation is not supported by your browser.");
        setShowSearchResults(true);
      }
      return;
    }

    setLocating(true);
    if (!silent) {
      setSearchError("");
      setShowSearchResults(false);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Reverse Geocode
          const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: "json",
            addressdetails: "1",
          });

          const response = await fetch(
            `${NOMINATIM_REVERSE_URL}?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "User-Agent": "MarketplaceApp/1.0",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Unable to get address for your location.");
          }

          const result = await response.json();
          selectSearchResult(result);
        } catch (err) {
          console.error("Current location error:", err);
          if (!silent) {
            setSearchError(
              err?.message || "Unable to get address for your location."
            );
            setShowSearchResults(true);
          }
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (silent) return; // don't show error if it was automatic

        let message = "Unable to get your location.";
        if (err.code === 1)
          message =
            "Location permission denied. Please allow location access in your browser.";
        if (err.code === 2)
          message = "Location unavailable. Please try again.";
        if (err.code === 3)
          message = "Location request timed out. Please try again.";

        setSearchError(message);
        setShowSearchResults(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /* ============================================================
     DELIVERY QUOTE
  ============================================================ */
  useEffect(() => {
    if (!location || items.length === 0) {
      setDeliveryQuote(null);
      setCalculatingDelivery(false);
      return;
    }

    if (!accessToken) {
      setDeliveryQuote(null);
      setCalculatingDelivery(false);
      return;
    }

    let cancelled = false;

    const fetchDeliveryQuote = async () => {
      try {
        setCalculatingDelivery(true);
        setDeliveryQuote(null);

        const quote = await api("/orders/delivery-quote", {
          method: "POST",
          accessToken,
          body: JSON.stringify({
            latitude: location.lat,
            longitude: location.lng,
          }),
        });

        if (cancelled) return;
        if (!quote) throw new Error("The server did not return a delivery quote.");

        setDeliveryQuote(quote);
        setError("");
      } catch (err) {
        console.error("Delivery quote error:", err);
        if (cancelled) return;
        setDeliveryQuote(null);
        setError(err?.message || "Unable to calculate delivery fee.");
      } finally {
        if (!cancelled) setCalculatingDelivery(false);
      }
    };

    fetchDeliveryQuote();
    return () => {
      cancelled = true;
    };
  }, [location, accessToken, items.length]);

  /* ============================================================
     SUBMIT ORDER
  ============================================================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!user) return setError("Your session has expired. Please login again.");
    if (!accessToken)
      return setError("Your session is still loading. Please wait a moment.");
    if (items.length === 0) return setError("Your cart is empty.");
    if (!form.fullName.trim()) return setError("Please enter your full name.");
    if (!form.phone.trim()) return setError("Please enter your phone number.");
    if (!form.address.trim()) return setError("Please enter your address.");
    if (!form.city.trim()) return setError("Please enter your city.");
    if (!form.country.trim()) return setError("Please enter your country.");
    if (!location)
      return setError("Please select your delivery location.");
    if (calculatingDelivery)
      return setError("Please wait while the delivery fee is calculated.");
    if (!deliveryQuote)
      return setError("Please wait for the delivery fee to be calculated.");
    if (paymentMethod !== "cod")
      return setError("Online payment is not available yet.");

    try {
      setSubmitting(true);

      const order = await api("/orders", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          shippingAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            country: form.country.trim(),
            latitude: location.lat,
            longitude: location.lng,
          },
          paymentMethod,
        }),
      });

      if (!order?._id) throw new Error("Order ID was not returned.");

      resetCart();
      navigate(`/orders/${order._id}`, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading states
  if (authChecking || cartLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading checkout...</span>
        </div>
      </div>
    );
  }

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

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">
            Add some products before going to checkout.
          </p>
          <Button asChild className="mt-6">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-3"
            onClick={() => navigate("/cart")}
            disabled={submitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your delivery information, choose your location, and review
            your delivery fee.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT */}
            <div className="space-y-6 lg:col-span-2">
              {/* SHIPPING ADDRESS */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Shipping Address</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Where should we deliver your order?
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="98XXXXXXXX"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Kathmandu"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
                      Address
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Street, house number, area..."
                      disabled={submitting}
                      className="w-full resize-none rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">
                      Postal Code <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="44600"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
                      Country
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="Nepal"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>
                </div>
              </section>

              {/* DELIVERY LOCATION */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Delivery Location</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search for a place, click on the map, or use your current location.
                  </p>
                </div>

                {/* SEARCH + AUTO LOCATE */}
               {/*<div className="relative z-1000"> */}
                <div className="relative">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchError("");
                          if (e.target.value.trim()) setShowSearchResults(true);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowSearchResults(true);
                        }}
                        placeholder="Search place or landmark..."
                        disabled={submitting || locating}
                        className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={searchLocation}
                        disabled={searchingLocation || submitting || locating}
                      >
                        {searchingLocation ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="mr-2 h-4 w-4" />
                        )}
                        Search
                      </Button>

                      {/* ========== LIVE LOCATION BUTTON ========== */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => useCurrentLocation(false)}
                        disabled={locating || searchingLocation || submitting}
                        className="min-w-35"
                      >
                        {locating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Locating...
                          </>
                        ) : (
                          <>
                            <LocateFixed className="mr-2 h-4 w-4" />
                            Use my location
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Boudhanath Stupa", "Thamel", "Patan Durbar Square", "Kathmandu Mall"].map(
                      (example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setSearchQuery(example);
                            setTimeout(() => searchLocation(), 0);
                          }}
                          className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {example}
                        </button>
                      )
                    )}
                  </div>

                  {/* Results dropdown */}
                  {showSearchResults && (
                    <div className="absolute left-0 right-0 top-full z-0 mt-2 overflow-hidden rounded-lg border bg-background shadow-xl">
                      {searchingLocation && (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching locations...
                        </div>
                      )}
                      {!searchingLocation && searchError && (
                        <div className="px-4 py-3 text-sm text-destructive">
                          {searchError}
                        </div>
                      )}
                      {!searchingLocation && !searchError && searchResults.length > 0 && (
                        <div className="max-h-72 overflow-y-auto">
                          {searchResults.map((result, index) => (
                            <button
                              key={`${result.place_id}-${index}`}
                              type="button"
                              onClick={() => selectSearchResult(result)}
                              className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {result.name || result.display_name?.split(",")[0] || "Location"}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                  {result.display_name}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* MAP */}
                <div className="relative z-0 mt-5 overflow-hidden rounded-xl border">
                  <MapContainer
                    center={[DEFAULT_MAP_POSITION.lat, DEFAULT_MAP_POSITION.lng]}
                    zoom={DEFAULT_ZOOM}
                    scrollWheelZoom
                    style={{ height: "400px", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController location={location} />
                    <LocationSelector
                      location={location}
                      setLocation={setLocation}
                      disabled={submitting}
                    />
                  </MapContainer>
                </div>

                {/* Location status */}
                <div className="mt-4">
                  {location ? (
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Delivery location selected</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Lat: {location.lat.toFixed(6)} | Lng: {location.lng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">Select your delivery location</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click “Use my location” or search / click on the map
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Fee Box */}
                {location && (
                  <div className="mt-4 rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Delivery fee</p>
                        {calculatingDelivery ? (
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Calculating...
                          </div>
                        ) : deliveryQuote ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            From {deliveryQuote?.delivery?.vendors?.length || 0} vendor(s)
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-destructive">Unable to calculate</p>
                        )}
                      </div>
                      <div className="text-right font-semibold">
                        {calculatingDelivery ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : deliveryQuote ? (
                          `RS ${deliveryFee.toFixed(2)}`
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* PAYMENT */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-lg font-semibold">Payment Method</h2>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                    paymentMethod === "cod" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pay when your order arrives.
                    </p>
                  </div>
                </label>
              </section>
            </div>

            {/* ORDER SUMMARY */}
            <aside className="lg:col-span-1">
              <div className="sticky top-6 rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold">Order Summary</h2>

                <div className="mt-5 space-y-4">
                  {items.map((item) => {
                    const product = item?.product;
                    if (!product) return null;
                    const price = Number(getFinalPrice(product) || 0);
                    const quantity = Number(item.quantity || 0);
                    return (
                      <div key={product._id} className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
                          <div className="mt-1 flex justify-between text-sm">
                            <span className="text-muted-foreground">Qty: {quantity}</span>
                            <span className="font-medium">RS {(price * quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-5 border-t" />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>RS {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>
                      {calculatingDelivery
                        ? "Calculating..."
                        : deliveryQuote
                        ? `RS ${deliveryFee.toFixed(2)}`
                        : "Select location"}
                    </span>
                  </div>
                </div>

                <div className="my-5 border-t" />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">RS {grandTotal.toFixed(2)}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={submitting || calculatingDelivery || !deliveryQuote}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Place Order
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => navigate("/cart")}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Cart
                </Button>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
