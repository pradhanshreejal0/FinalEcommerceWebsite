import { useEffect, useState } from "react";
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

/*
|--------------------------------------------------------------------------
| Fix Leaflet marker icons for Vite
|--------------------------------------------------------------------------
*/

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/*
|--------------------------------------------------------------------------
| Default Map Location
|--------------------------------------------------------------------------
*/

const DEFAULT_MAP_POSITION = [27.7172, 85.324];
const DEFAULT_ZOOM = 13;

/*
|--------------------------------------------------------------------------
| Map Location Selector
|--------------------------------------------------------------------------
|
| Allows:
| - Clicking map
| - Dragging marker
|
*/

function LocationSelector({
  location,
  setLocation,
  disabled,
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
          const newLocation = marker.getLatLng();

          setLocation({
            lat: newLocation.lat,
            lng: newLocation.lng,
          });
        },
      }}
    >
      <Popup>
        <div className="text-sm">
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

/*
|--------------------------------------------------------------------------
| Map Controller
|--------------------------------------------------------------------------
|
| Moves the map when a search result is selected.
|
*/

function MapController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(
      [location.lat, location.lng],
      17,
      {
        animate: true,
        duration: 1.2,
      }
    );
  }, [location, map]);

  return null;
}

/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
*/

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

  /*
  |--------------------------------------------------------------------------
  | Shipping Form
  |--------------------------------------------------------------------------
  */

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Nepal",
  });

  /*
  |--------------------------------------------------------------------------
  | Delivery Location
  |--------------------------------------------------------------------------
  */

  const [location, setLocation] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Location Search
  |--------------------------------------------------------------------------
  */

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Payment
  |--------------------------------------------------------------------------
  */

  const [paymentMethod, setPaymentMethod] =
    useState("cod");

  /*
  |--------------------------------------------------------------------------
  | Delivery Quote
  |--------------------------------------------------------------------------
  */

  const [deliveryQuote, setDeliveryQuote] =
    useState(null);

  const [
    calculatingDelivery,
    setCalculatingDelivery,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Submission
  |--------------------------------------------------------------------------
  */

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Protect Checkout
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
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
  }, [user, navigate]);

  /*
  |--------------------------------------------------------------------------
  | Set User Name After Auth Loads
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user?.name) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      fullName:
        previous.fullName || user.name,
    }));
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Update Form
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Cart Items
  |--------------------------------------------------------------------------
  */

  const items = cart?.items || [];

  /*
  |--------------------------------------------------------------------------
  | Subtotal
  |--------------------------------------------------------------------------
  */

  const subtotal = items.reduce(
    (sum, item) => {
      if (!item.product) {
        return sum;
      }

      const price = getFinalPrice(
        item.product
      );

      const quantity = Number(
        item.quantity || 0
      );

      return sum + price * quantity;
    },
    0
  );

  /*
  |--------------------------------------------------------------------------
  | Item Count
  |--------------------------------------------------------------------------
  */

  const itemCount = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0),
    0
  );

  /*
  |--------------------------------------------------------------------------
  | Delivery Fee
  |--------------------------------------------------------------------------
  */

  const deliveryFee = Number(
    deliveryQuote?.deliveryFee || 0
  );

  /*
  |--------------------------------------------------------------------------
  | Grand Total
  |--------------------------------------------------------------------------
  */

  const grandTotal =
    subtotal + deliveryFee;

  /*
  |--------------------------------------------------------------------------
  | Search Location
  |--------------------------------------------------------------------------
  |
  | Uses OpenStreetMap Nominatim to find:
  | - Places
  | - Addresses
  | - Landmarks
  | - Buildings
  | - Areas
  |
  */

  const searchLocation = async (
    event
  ) => {
    event?.preventDefault();

    const query =
      searchQuery.trim();

    if (!query) {
      setSearchError(
        "Enter a place, address, or landmark."
      );

      return;
    }

    try {
      setSearchingLocation(true);
      setSearchError("");
      setSearchResults([]);

      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "np",
      });

      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
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

      if (!results.length) {
        setSearchError(
          "No locations found. Try a nearby landmark, area, street, or place name."
        );

        return;
      }

      setSearchResults(results);
    } catch (err) {
      console.error(
        "Location search error:",
        err
      );

      setSearchError(
        "Unable to search for that location. Please try again."
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Select Search Result
  |--------------------------------------------------------------------------
  */

  const selectSearchResult = (
    result
  ) => {
    const lat = Number(
      result.lat
    );

    const lng = Number(
      result.lon
    );

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

    /*
    | Automatically populate address fields
    | when possible.
    */

    const address =
      result.address || {};

    const detectedCity =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      "";

    const detectedPostalCode =
      address.postcode || "";

    setForm((previous) => ({
      ...previous,

      address:
        previous.address ||
        result.display_name ||
        "",

      city:
        previous.city ||
        detectedCity,

      postalCode:
        previous.postalCode ||
        detectedPostalCode,

      country:
        previous.country ||
        "Nepal",
    }));

    setSearchQuery(
      result.display_name || ""
    );

    setSearchResults([]);
    setSearchError("");
    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Clear Search
  |--------------------------------------------------------------------------
  */

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Calculate Delivery Quote
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !accessToken ||
      !location ||
      items.length === 0
    ) {
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

          setError("");

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

          if (!cancelled) {
            setDeliveryQuote(
              quote
            );
          }
        } catch (err) {
          console.error(
            "Delivery quote error:",
            err
          );

          if (!cancelled) {
            setDeliveryQuote(null);

            setError(
              err?.message ||
                "Unable to calculate delivery fee."
            );
          }
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

  /*
  |--------------------------------------------------------------------------
  | Place Order
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      /*
      |--------------------------------------------------------------------------
      | Authentication
      |--------------------------------------------------------------------------
      */

      if (!accessToken) {
        setError(
          "Your session has expired. Please login again."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Cart
      |--------------------------------------------------------------------------
      */

      if (items.length === 0) {
        setError(
          "Your cart is empty."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Full Name
      |--------------------------------------------------------------------------
      */

      if (!form.fullName.trim()) {
        setError(
          "Please enter your full name."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Phone
      |--------------------------------------------------------------------------
      */

      if (!form.phone.trim()) {
        setError(
          "Please enter your phone number."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Address
      |--------------------------------------------------------------------------
      */

      if (!form.address.trim()) {
        setError(
          "Please enter your address."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | City
      |--------------------------------------------------------------------------
      */

      if (!form.city.trim()) {
        setError(
          "Please enter your city."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Country
      |--------------------------------------------------------------------------
      */

      if (!form.country.trim()) {
        setError(
          "Please enter your country."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Location
      |--------------------------------------------------------------------------
      */

      if (!location) {
        setError(
          "Please select your delivery location on the map."
        );

        return;
      }

      if (
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng)
      ) {
        setError(
          "The selected map location is invalid."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Delivery Calculation
      |--------------------------------------------------------------------------
      */

      if (calculatingDelivery) {
        setError(
          "Please wait while we calculate your delivery fee."
        );

        return;
      }

      if (!deliveryQuote) {
        setError(
          "Please select a delivery location and wait for the delivery fee to be calculated."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Payment
      |--------------------------------------------------------------------------
      */

      if (paymentMethod !== "cod") {
        setError(
          "Online payment is not available yet. Please select Cash on Delivery."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Submit
      |--------------------------------------------------------------------------
      */

      try {
        setSubmitting(true);

        const order =
          await api("/orders", {
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
          });

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

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (!user || cartLoading) {
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

  /*
  |--------------------------------------------------------------------------
  | Empty Cart
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Checkout UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}

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
            Enter your delivery information
            and select your exact delivery
            location.
          </p>
        </div>

        {/* Error */}

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

            {/* ==========================================================
                LEFT
            ========================================================== */}

            <div className="min-w-0 space-y-6 lg:col-span-2">

              {/* ========================================================
                  SHIPPING ADDRESS
              ======================================================== */}

              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Shipping Address
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the address where
                    your order should be
                    delivered.
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

              {/* ========================================================
                  DELIVERY LOCATION
              ======================================================== */}

              <section className="relative z-0 overflow-visible rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />

                    <h2 className="text-lg font-semibold">
                      Delivery Location
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Search for your address or
                    landmark, select the result,
                    then adjust the marker if
                    necessary.
                  </p>
                </div>

                {/* ======================================================
                    LOCATION SEARCH
                ====================================================== */}

                <div className="relative z-[1001]">

                  <form
                    onSubmit={
                      searchLocation
                    }
                    className="flex gap-2"
                  >
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        value={
                          searchQuery
                        }
                        onChange={(event) => {
                          setSearchQuery(
                            event.target
                              .value
                          );

                          if (
                            searchError
                          ) {
                            setSearchError(
                              ""
                            );
                          }
                        }}
                        placeholder="Search place, address or landmark..."
                        disabled={
                          submitting ||
                          searchingLocation
                        }
                        className="h-11 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      />

                      {searchQuery && (
                        <button
                          type="button"
                          onClick={
                            clearSearch
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        searchingLocation ||
                        submitting ||
                        !searchQuery.trim()
                      }
                      className="h-11 shrink-0"
                    >
                      {searchingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Search Error */}

                  {searchError && (
                    <p className="mt-2 text-xs text-destructive">
                      {searchError}
                    </p>
                  )}

                  {/* Search Results */}

                  {searchResults.length >
                    0 && (
                    <div className="absolute left-0 right-0 top-[52px] z-[2000] overflow-hidden rounded-lg border bg-background shadow-xl">

                      <div className="border-b px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Search results
                        </p>
                      </div>

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
                              className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/60"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-medium">
                                  {result.name ||
                                    result.display_name}
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
                    </div>
                  )}
                </div>

                {/* ======================================================
                    SEARCH HELP
                ====================================================== */}

                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Example:
                  </span>{" "}
                  Boudhanath Stupa, Kathmandu,
                  Thamel, Patan Durbar Square,
                  Kathmandu Mall, or your street
                  address.
                </div>

                {/* ======================================================
                    MAP
                ====================================================== */}

                <div className="relative z-0 mt-4 w-full overflow-hidden rounded-xl border">
                  <MapContainer
                    center={
                      DEFAULT_MAP_POSITION
                    }
                    zoom={
                      DEFAULT_ZOOM
                    }
                    scrollWheelZoom={
                      true
                    }
                    className="w-full"
                    style={{
                      height: "400px",
                      width: "100%",
                      position:
                        "relative",
                      zIndex: 0,
                    }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapController
                      location={
                        location
                      }
                    />

                    <LocationSelector
                      location={
                        location
                      }
                      setLocation={
                        setLocation
                      }
                      disabled={
                        submitting
                      }
                    />
                  </MapContainer>
                </div>

                {/* ======================================================
                    MAP INSTRUCTIONS
                ====================================================== */}

                <div className="mt-3 grid gap-2 sm:grid-cols-3">

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold">
                      1. Search
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Search your address or
                      nearby landmark.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold">
                      2. Select
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a result or click
                      directly on the map.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold">
                      3. Adjust
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Drag the marker to your
                      exact delivery point.
                    </p>
                  </div>

                </div>

                {/* ======================================================
                    SELECTED LOCATION
                ====================================================== */}

                <div className="mt-4">

                  {location ? (
                    <div className="rounded-lg border bg-muted/40 p-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-medium">
                            Delivery location
                            selected
                          </p>

                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            Latitude:{" "}
                            {location.lat.toFixed(
                              6
                            )}
                          </p>

                          <p className="break-all text-xs text-muted-foreground">
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
                        No delivery location
                        selected
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Search for a place or
                        click on the map.
                      </p>

                    </div>
                  )}

                </div>

                {/* ======================================================
                    DELIVERY CALCULATION
                ====================================================== */}

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
                                ?.length ||
                              0
                            }{" "}
                            vendor
                            {(
                              deliveryQuote
                                ?.delivery
                                ?.vendors
                                ?.length ||
                              0
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
                                    {
                                      vendorDelivery.distanceKm
                                    }{" "}
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

              {/* ========================================================
                  PAYMENT
              ======================================================== */}

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
                      paymentMethod ===
                      "cod"
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

            {/* ==========================================================
                RIGHT - ORDER SUMMARY
            ========================================================== */}

            <aside className="min-w-0 lg:col-span-1">

              <div className="sticky top-6 rounded-xl border bg-background p-5 shadow-sm sm:p-6">

                <h2 className="text-lg font-semibold">
                  Order Summary
                </h2>

                {/* Items */}

                <div className="mt-5 space-y-4">

                  {items.map((item) => {
                    const product =
                      item.product;

                    if (!product) {
                      return null;
                    }

                    const image =
                      product.images?.[0] ||
                      "";

                    const price =
                      getFinalPrice(
                        product
                      );

                    const quantity =
                      Number(
                        item.quantity || 0
                      );

                    const itemSubtotal =
                      price * quantity;

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
                  })}

                </div>

                <div className="my-5 border-t" />

                {/* Item Count */}

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
                    navigate(
                      "/cart"
                    )
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
