import { useEffect, useMemo, useRef, useState } from "react";
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
  Wallet,
  Banknote,
} from "lucide-react";
import {
  initiatePayment,
  redirectToPaymentGateway,
  isOnlinePayment,
  openKhaltiCheckout,
} from "@/lib/payment";

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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

/** Fit map to show all search-result markers in real time */
function FitSearchBounds({ results, selectedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!results?.length) return;

    const points = results
      .map((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        return Number.isFinite(lat) && Number.isFinite(lng)
          ? [lat, lng]
          : null;
      })
      .filter(Boolean);

    if (selectedLocation?.lat != null && selectedLocation?.lng != null) {
      points.push([selectedLocation.lat, selectedLocation.lng]);
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 14), { duration: 0.5 });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
  }, [results, selectedLocation, map]);

  return null;
}

/** Blue pin for the confirmed delivery location */
const selectedIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Smaller grey/outline pin for live search results */
const searchResultIcon = L.divIcon({
  className: "search-result-marker",
  html: `<div style="
    width: 14px; height: 14px;
    background: #3b82f6;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/* ============================================================
   LOCATION SELECTOR
============================================================ */

function LocationSelector({
  location,
  setLocation,
  onMapPick,
  disabled = false,
}) {
  useMapEvents({
    click(event) {
      if (disabled) return;
      const { lat, lng } = event.latlng;
      setLocation({ lat, lng });
      onMapPick?.({ lat, lng });
    },
  });

  if (!location) return null;

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={selectedIcon}
      draggable={!disabled}
      eventHandlers={{
        dragend(event) {
          if (disabled) return;
          const marker = event.target;
          const newPosition = marker.getLatLng();
          const next = {
            lat: newPosition.lat,
            lng: newPosition.lng,
          };
          setLocation(next);
          onMapPick?.(next);
        },
      }}
      zIndexOffset={1000}
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

/** Real-time markers for live search results — click to select */
function SearchResultMarkers({ results, onSelect, selectedLocation }) {
  if (!results?.length) return null;

  return (
    <>
      {results.map((result, index) => {
        const lat = Number(result.lat);
        const lng = Number(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        // Skip if it matches the already-selected pin (avoid double marker)
        if (
          selectedLocation &&
          Math.abs(selectedLocation.lat - lat) < 1e-5 &&
          Math.abs(selectedLocation.lng - lng) < 1e-5
        ) {
          return null;
        }

        const label =
          result.name || result.display_name?.split(",")[0] || "Location";

        return (
          <Marker
            key={`${result.place_id || index}-${lat}-${lng}`}
            position={[lat, lng]}
            icon={searchResultIcon}
            eventHandlers={{
              click: () => onSelect?.(result),
            }}
          >
            <Popup>
              <div className="min-w-40 text-sm">
                <p className="font-semibold">{label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {result.display_name}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                  onClick={() => onSelect?.(result)}
                >
                  Use this location
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
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
    phone: user?.phone || "",
    address: "",
    city: "",
    postalCode: "",
    country: "Nepal",
  });

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  // "map" | "form" | "search" — avoids address↔map feedback loops
  const locationSourceRef = useRef("search");
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  // City field autocomplete — only cities/towns/villages
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [searchingCity, setSearchingCity] = useState(false);
  const debouncedCity = useDebouncedValue(form.city, 400);

  // Address field autocomplete — places within the selected city
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const debouncedAddress = useDebouncedValue(form.address, 400);

  // Remember city center coords so address search can bias toward the city
  const [cityCenter, setCityCenter] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
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
      phone: prev.phone || user.phone || "",
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
          locateUser(true); // silent = true
        }
      })
      .catch(() => {
        // permissions API not supported → do nothing
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // User is typing address fields → allow address→map geocode
    if (name === "city" || name === "address" || name === "postalCode") {
      locationSourceRef.current = "form";
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (name === "city") {
      setCityCenter(null);
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item?.product) return sum;
      const product = item.product;
      const variantKey = item.variantKey || "";
      let unitPrice = Number(getFinalPrice(product) || 0);
      if (variantKey && Array.isArray(product.variants)) {
        const match = product.variants.find((v) => v.key === variantKey);
        if (match) {
          const disc = Number(product.discountPercentage) || 0;
          unitPrice =
            disc > 0
              ? match.price - (match.price * disc) / 100
              : match.price;
        }
      }
      const quantity = Number(item.quantity || 0);
      return sum + unitPrice * quantity;
    }, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  }, [items]);

  const deliveryFee = Number(deliveryQuote?.deliveryFee || 0);
  const grandTotal = subtotal + deliveryFee;

  /* ============================================================
     SEARCH LOCATION (live / as-you-type)
  ============================================================ */
  const searchLocation = async (overrideQuery) => {
    const query = (overrideQuery ?? searchQuery).trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("");
      setShowSearchResults(false);
      setSearchingLocation(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setShowSearchResults(false);
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
        limit: "6",
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

  // Live search as the user types (debounced)
  useEffect(() => {
    const term = debouncedSearchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchError("");
      if (!term) setShowSearchResults(false);
      setSearchingLocation(false);
      return;
    }
    searchLocation(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchLocation();
    }
  };

  /* ============================================================
     SELECT SEARCH RESULT
  ============================================================ */
  /** Fill address/city/postal from a Nominatim result (map or search). */
  const applyNominatimToForm = (result, { updateSearchQuery = true } = {}) => {
    const address = result.address || {};
    const displayName = result.display_name || "";

    const road =
      address.road ||
      address.pedestrian ||
      address.footway ||
      address.path ||
      "";
    const houseNumber = address.house_number || "";
    const neighbourhood =
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.residential ||
      "";
    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
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
    if (!generatedAddress) {
      // Prefer first segment of display name over the full long string
      generatedAddress = displayName.split(",").slice(0, 2).join(",").trim();
    }

    setForm((prev) => ({
      ...prev,
      address: generatedAddress || prev.address,
      city: city || prev.city,
      postalCode: postcode || prev.postalCode,
      country: address.country || prev.country || "Nepal",
    }));

    if (updateSearchQuery && displayName) {
      setSearchQuery(displayName);
    }
  };

  const selectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    locationSourceRef.current = "search";
    setLocation({ lat, lng });
    applyNominatimToForm(result, { updateSearchQuery: true });

    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError("");
    setError("");
  };

  /**
   * Map → address: reverse-geocode pin and autofill form fields.
   */
  const handleMapPick = async ({ lat, lng }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    locationSourceRef.current = "map";
    setReverseGeocoding(true);
    setError("");

    try {
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
        throw new Error("Unable to resolve address for this map pin.");
      }

      const result = await response.json();
      applyNominatimToForm(result, { updateSearchQuery: true });
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (err) {
      console.error("Map reverse-geocode error:", err);
      // Keep coordinates; user can still type address manually
    } finally {
      setReverseGeocoding(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowSearchResults(false);
  };

  /* ============================================================
     CITY AUTOCOMPLETE
     Only suggests cities / towns / municipalities / villages.
  ============================================================ */
  useEffect(() => {
    const query = debouncedCity.trim();

    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    let cancelled = false;

    const fetchCitySuggestions = async () => {
      try {
        setSearchingCity(true);

        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "10",
          countrycodes: "np",
          featuretype: "city",
        });

        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "MarketplaceApp/1.0",
          },
        });

        if (!response.ok) throw new Error("Unable to fetch cities.");

        const results = await response.json();
        if (cancelled) return;

        const CITY_TYPES = new Set([
          "city",
          "town",
          "municipality",
          "village",
          "hamlet",
          "suburb",
          "county",
          "state_district",
          "administrative",
        ]);
        const CITY_CLASSES = new Set(["place", "boundary"]);

        const filtered = (Array.isArray(results) ? results : []).filter((r) => {
          const type = (r.type || "").toLowerCase();
          const cls = (r.class || "").toLowerCase();
          if (CITY_CLASSES.has(cls) && CITY_TYPES.has(type)) return true;
          const addr = r.address || {};
          const cityName =
            addr.city || addr.town || addr.municipality || addr.village || "";
          return Boolean(cityName);
        });

        const seen = new Set();
        const unique = [];
        for (const r of filtered) {
          const addr = r.address || {};
          const name = (
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.village ||
            r.name ||
            r.display_name?.split(",")[0] ||
            ""
          ).trim();
          const key = name.toLowerCase();
          if (!name || seen.has(key)) continue;
          seen.add(key);
          unique.push({ ...r, _cityName: name });
          if (unique.length >= 6) break;
        }

        setCitySuggestions(unique);
      } catch (err) {
        console.error("City suggestion error:", err);
        if (!cancelled) setCitySuggestions([]);
      } finally {
        if (!cancelled) setSearchingCity(false);
      }
    };

    fetchCitySuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedCity]);

  const selectCitySuggestion = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const cityName =
      result._cityName ||
      result.address?.city ||
      result.address?.town ||
      result.address?.municipality ||
      result.address?.village ||
      result.name ||
      result.display_name?.split(",")[0] ||
      "";

    setForm((prev) => ({
      ...prev,
      city: cityName,
      country: "Nepal",
    }));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      locationSourceRef.current = "search";
      setCityCenter({ lat, lng });
      setLocation({ lat, lng });
    }

    setShowCitySuggestions(false);
    setCitySuggestions([]);
    setError("");
  };

  /* ============================================================
     ADDRESS AUTOCOMPLETE
     Suggests places / streets only within the selected city.
  ============================================================ */
  useEffect(() => {
    const addressQuery = debouncedAddress.trim();
    const city = form.city.trim();

    if (addressQuery.length < 3 || !city) {
      setAddressSuggestions([]);
      return;
    }

    let cancelled = false;

    const fetchAddressSuggestions = async () => {
      try {
        setSearchingAddress(true);

        const q = `${addressQuery}, ${city}, Nepal`;
        const params = new URLSearchParams({
          q,
          format: "json",
          addressdetails: "1",
          limit: "8",
          countrycodes: "np",
        });

        if (cityCenter) {
          const delta = 0.25;
          const viewbox = [
            cityCenter.lng - delta,
            cityCenter.lat + delta,
            cityCenter.lng + delta,
            cityCenter.lat - delta,
          ].join(",");
          params.set("viewbox", viewbox);
          params.set("bounded", "1");
        }

        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "MarketplaceApp/1.0",
          },
        });

        if (!response.ok) throw new Error("Unable to fetch addresses.");

        const results = await response.json();
        if (cancelled) return;

        const PLACE_TYPES = new Set([
          "house",
          "residential",
          "road",
          "street",
          "pedestrian",
          "path",
          "footway",
          "neighbourhood",
          "suburb",
          "quarter",
          "building",
          "apartments",
          "commercial",
          "retail",
          "hotel",
          "restaurant",
          "cafe",
          "shop",
          "mall",
          "hospital",
          "school",
          "college",
          "university",
          "place_of_worship",
          "attraction",
          "museum",
          "park",
          "amenity",
        ]);

        const filtered = (Array.isArray(results) ? results : []).filter((r) => {
          const type = (r.type || "").toLowerCase();
          const cls = (r.class || "").toLowerCase();
          if (["highway", "building", "amenity", "shop", "tourism", "leisure"].includes(cls))
            return true;
          if (PLACE_TYPES.has(type)) return true;
          const dn = (r.display_name || "").toLowerCase();
          return dn.includes(city.toLowerCase());
        });

        setAddressSuggestions(filtered.slice(0, 6));
      } catch (err) {
        console.error("Address suggestion error:", err);
        if (!cancelled) setAddressSuggestions([]);
      } finally {
        if (!cancelled) setSearchingAddress(false);
      }
    };

    fetchAddressSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedAddress, form.city, cityCenter]);

  const selectAddressSuggestion = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const address = result.address || {};
    const displayName = result.display_name || "";

    const road = address.road || address.pedestrian || address.footway || "";
    const houseNumber = address.house_number || "";
    const neighbourhood =
      address.neighbourhood || address.suburb || address.quarter || "";

    let generatedAddress = "";
    if (houseNumber || road) {
      generatedAddress = [houseNumber, road].filter(Boolean).join(" ");
    }
    if (neighbourhood) {
      generatedAddress = [generatedAddress, neighbourhood]
        .filter(Boolean)
        .join(", ");
    }
    if (!generatedAddress) {
      generatedAddress =
        result.name || displayName.split(",").slice(0, 2).join(",").trim();
    }

    const cityFromResult =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      form.city;

    locationSourceRef.current = "search";
    setForm((prev) => ({
      ...prev,
      address: generatedAddress || prev.address,
      city: cityFromResult || prev.city,
      postalCode: address.postcode || prev.postalCode,
      country: "Nepal",
    }));

    setLocation({ lat, lng });
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setError("");
  };

  /* ============================================================
     ADDRESS → MAP: auto-geocode when user types city + address
     (skipped when the last pin change came from the map itself)
  ============================================================ */
  useEffect(() => {
    const city = debouncedCity.trim();
    const address = debouncedAddress.trim();

    if (city.length < 2 || address.length < 5) return;
    // Map just filled these fields — don't bounce the pin again
    if (locationSourceRef.current === "map") return;

    let cancelled = false;

    const geocodeFullAddress = async () => {
      try {
        const q = `${address}, ${city}, Nepal`;
        const params = new URLSearchParams({
          q,
          format: "json",
          addressdetails: "1",
          limit: "1",
          countrycodes: "np",
        });

        if (cityCenter) {
          const delta = 0.3;
          const viewbox = [
            cityCenter.lng - delta,
            cityCenter.lat + delta,
            cityCenter.lng + delta,
            cityCenter.lat - delta,
          ].join(",");
          params.set("viewbox", viewbox);
          params.set("bounded", "0");
        }

        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "MarketplaceApp/1.0",
          },
        });

        if (!response.ok) return;
        const results = await response.json();
        if (cancelled || !Array.isArray(results) || results.length === 0) return;

        const lat = Number(results[0].lat);
        const lng = Number(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          locationSourceRef.current = "form";
          setLocation({ lat, lng });
        }
      } catch (err) {
        console.error("Auto-geocode error:", err);
      }
    };

    const timer = setTimeout(geocodeFullAddress, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [debouncedCity, debouncedAddress, cityCenter]);

  /* ============================================================
     USE CURRENT LOCATION (FIXED)
  ============================================================ */
  const locateUser = (silent = false) => {
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
    try {
      setSubmitting(true);

      const order = await api("/orders", {
        method: "POST",
        accessToken,
        body: {
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
          couponCode: couponCode.trim() || undefined,
        },
      });

      if (!order?._id) throw new Error("Order ID was not returned.");

      // Online payment: start gateway flow after order is created
      if (isOnlinePayment(paymentMethod)) {
        try {
          const paymentData = await initiatePayment(
            order._id,
            paymentMethod,
            accessToken
          );

          // Prefer backend redirect / form post
          if (redirectToPaymentGateway(paymentData)) {
            resetCart();
            return; // browser is navigating away
          }

          // Khalti client widget fallback (public key)
          if (
            paymentMethod === "khalti" &&
            import.meta.env.VITE_KHALTI_PUBLIC_KEY
          ) {
            const amount =
              Number(order.totalAmount) ||
              Number(deliveryQuote?.total) ||
              0;
            await openKhaltiCheckout({
              amountPaisa: Math.round(amount * 100),
              orderId: order._id,
              productName: `Order ${order._id}`,
              onSuccess: async (payload) => {
                try {
                  await api(`/orders/${order._id}/verify-payment`, {
                    method: "POST",
                    accessToken,
                    body: {
                      paymentMethod: "khalti",
                      token: payload?.token,
                      amount: payload?.amount,
                      idx: payload?.idx,
                    },
                  }).catch(() => null);
                } finally {
                  resetCart();
                  navigate(
                    `/payment/success?orderId=${order._id}&method=khalti`,
                    { replace: true }
                  );
                }
              },
              onError: () => {
                resetCart();
                navigate(
                  `/payment/failure?orderId=${order._id}&method=khalti`,
                  { replace: true }
                );
              },
              onClose: () => {
                // User closed widget — order exists, go to order detail to pay later
                resetCart();
                navigate(`/orders/${order._id}`, { replace: true });
              },
            });
            return;
          }

          // Backend accepted order but didn't return a gateway URL —
          // send user to the pay page so they can retry / pay later.
          resetCart();
          navigate(`/orders/${order._id}/pay`, { replace: true });
          return;
        } catch (payErr) {
          console.error("Payment initiate error:", payErr);
          // Order was created; let user pay from order page
          resetCart();
          navigate(`/orders/${order._id}/pay`, {
            replace: true,
            state: {
              paymentError:
                payErr?.message ||
                "Could not open payment gateway. You can try again from this page.",
            },
          });
          return;
        }
      }

      // COD — normal flow
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
                    Enter your city first (suggestions show cities only), then
                    type your address — suggestions are limited to that city.
                    Selecting either will place a pin on the map below.
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

                  <div className="relative">
                    <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="off"
                      value={form.city}
                      onChange={(e) => {
                        handleChange(e);
                        setShowCitySuggestions(true);
                      }}
                      onFocus={() => {
                        if (citySuggestions.length > 0) setShowCitySuggestions(true);
                      }}
                      onBlur={() => {
                        // Small delay so a click on a suggestion registers first
                        setTimeout(() => setShowCitySuggestions(false), 150);
                      }}
                      placeholder="Kathmandu"
                      disabled={submitting}
                      className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />

                    {showCitySuggestions && (searchingCity || citySuggestions.length > 0) && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-xl">
                        {searchingCity && (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finding cities...
                          </div>
                        )}
                        {!searchingCity &&
                          citySuggestions.map((result, index) => (
                            <button
                              key={`${result.place_id}-${index}`}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectCitySuggestion(result)}
                              className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {result._cityName ||
                                    result.name ||
                                    result.display_name?.split(",")[0] ||
                                    "City"}
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

                  <div className="relative sm:col-span-2">
                    <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
                      Address
                      {!form.city.trim() && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (select a city first for better suggestions)
                        </span>
                      )}
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={form.address}
                      autoComplete="off"
                      onChange={(e) => {
                        handleChange(e);
                        if (form.city.trim()) setShowAddressSuggestions(true);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowAddressSuggestions(false), 150);
                      }}
                      placeholder={
                        form.city.trim()
                          ? `Street, house number, area in ${form.city}...`
                          : "Street, house number, area..."
                      }
                      disabled={submitting}
                      className="w-full resize-none rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />

                    {showAddressSuggestions &&
                      form.city.trim() &&
                      (searchingAddress || addressSuggestions.length > 0) && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-xl">
                          {searchingAddress && (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Finding places in {form.city}...
                            </div>
                          )}
                          {!searchingAddress &&
                            addressSuggestions.map((result, index) => (
                              <button
                                key={`${result.place_id}-${index}`}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectAddressSuggestion(result)}
                                className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                              >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {result.name ||
                                      result.display_name?.split(",")[0] ||
                                      "Place"}
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
               <div className="relative z-20">
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
                        placeholder="Type a place e.g. Kathmandu..."
                        disabled={submitting || locating}
                        className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      />
                      {searchingLocation && (
                        <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
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
                      {/* ========== LIVE LOCATION BUTTON ========== */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => locateUser(false)}
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
                    {["Boudhanath Stupa", "Thamel", "Patan Durbar Square", "Kathmandu"].map(
                      (example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setSearchQuery(example);
                            setShowSearchResults(true);
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
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border bg-background shadow-xl">
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

                {/* MAP — selected pin + live search-result markers */}
                <div className="relative z-20 mt-5 overflow-hidden rounded-xl border">
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
                    {/* When searching, fit all result pins; otherwise fly to selected */}
                    {searchResults.length > 0 ? (
                      <FitSearchBounds
                        results={searchResults}
                        selectedLocation={location}
                      />
                    ) : (
                      <MapController location={location} />
                    )}
                    <SearchResultMarkers
                      results={searchResults}
                      onSelect={selectSearchResult}
                      selectedLocation={location}
                    />
                    <LocationSelector
                      location={location}
                      setLocation={setLocation}
                      onMapPick={handleMapPick}
                      disabled={submitting}
                    />
                  </MapContainer>
                  {searchResults.length > 0 && (
                    <p className="absolute bottom-2 left-2 z-1000 rounded-md bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow">
                      {searchResults.length} place
                      {searchResults.length === 1 ? "" : "s"} on map — click a
                      pin to select
                    </p>
                  )}
                  {reverseGeocoding && (
                    <p className="absolute bottom-2 right-2 z-1000 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Filling address from map…
                    </p>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Tip: click or drag the map pin to autofill address fields, or
                  type city/address and the map pin will move to match.
                </p>

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
                          {(form.address || form.city) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[form.address, form.city, form.postalCode]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">Select your delivery location</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click "Use my location" or search / click on the map
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

              {/* COUPON */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <h2 className="mb-3 text-lg font-semibold">Promo code</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponPreview(null);
                    }}
                    placeholder="Enter code e.g. SAVE10"
                    disabled={submitting}
                    className="w-full rounded-md border bg-background px-3 py-2.5 text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting || couponLoading || !couponCode.trim()}
                    onClick={async () => {
                      setCouponLoading(true);
                      setError("");
                      try {
                        const data = await api("/coupons/validate", {
                          method: "POST",
                          accessToken,
                          body: { code: couponCode.trim() },
                        });
                        setCouponPreview(data);
                      } catch (err) {
                        setCouponPreview(null);
                        setError(err.message || "Invalid coupon");
                      } finally {
                        setCouponLoading(false);
                      }
                    }}
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {couponPreview?.valid && (
                  <p className="mt-2 text-sm text-emerald-600">
                    Coupon applied — save RS{" "}
                    {Number(couponPreview.discountAmount).toFixed(2)}
                  </p>
                )}
              </section>

              {/* PAYMENT */}
              <section className="rounded-xl border bg-background p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-lg font-semibold">Payment Method</h2>
                <div className="space-y-3">
                  {/* COD */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                      disabled={submitting}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Pay with cash when your order arrives.
                      </p>
                    </div>
                  </label>

                  {/* eSewa */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === "esewa"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="esewa"
                      checked={paymentMethod === "esewa"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                      disabled={submitting}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                      <span className="text-xs font-bold tracking-tight">eS</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">eSewa</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Pay securely online with eSewa wallet or linked bank.
                      </p>
                    </div>
                  </label>

                  {/* Khalti */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === "khalti"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="khalti"
                      checked={paymentMethod === "khalti"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                      disabled={submitting}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Khalti</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Pay with Khalti, banking, or cards via Khalti Checkout.
                      </p>
                    </div>
                  </label>
                </div>

                {isOnlinePayment(paymentMethod) && (
                  <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    After placing the order you will be redirected to{" "}
                    <strong className="text-foreground">
                      {paymentMethod === "esewa" ? "eSewa" : "Khalti"}
                    </strong>{" "}
                    to complete payment securely.
                  </p>
                )}
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
                    const variantKey = item.variantKey || "";
                    const variantLabel = item.variantLabel || "";
                    let unitPrice = Number(getFinalPrice(product) || 0);
                    if (variantKey && Array.isArray(product.variants)) {
                      const match = product.variants.find((v) => v.key === variantKey);
                      if (match) {
                        const disc = Number(product.discountPercentage) || 0;
                        unitPrice =
                          disc > 0
                            ? match.price - (match.price * disc) / 100
                            : match.price;
                      }
                    }
                    const quantity = Number(item.quantity || 0);
                    return (
                      <div
                        key={`${product._id}:${variantKey}`}
                        className="flex gap-3"
                      >
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
                          {variantLabel ? (
                            <p className="text-xs text-muted-foreground">{variantLabel}</p>
                          ) : null}
                          <div className="mt-1 flex justify-between text-sm">
                            <span className="text-muted-foreground">Qty: {quantity}</span>
                            <span className="font-medium">
                              RS {(unitPrice * quantity).toFixed(2)}
                            </span>
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
