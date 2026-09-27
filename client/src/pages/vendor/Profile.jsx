import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Loader2,
  MapPin,
  Search,
  X,
  LocateFixed,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_POSITION = { lat: 27.7172, lng: 85.324 };
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

function MapController({ location }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15), {
      duration: 0.6,
    });
  }, [location, map]);
  return null;
}

function LocationSelector({ location, setLocation }) {
  useMapEvents({
    click(e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  if (!location) return null;
  return (
    <Marker
      position={[location.lat, location.lng]}
      draggable
      eventHandlers={{
        dragend(e) {
          const p = e.target.getLatLng();
          setLocation({ lat: p.lat, lng: p.lng });
        },
      }}
    />
  );
}

export default function VendorProfile() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
    logo: "",
    banner: "",
    status: "",
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    country: "Nepal",
  });

  const [location, setLocation] = useState(DEFAULT_POSITION);
  const [locating, setLocating] = useState(false);

  // Place search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api("/vendors/me", { accessToken });
        if (cancelled) return;

        setForm({
          storeName: data.storeName || "",
          storeDescription: data.storeDescription || "",
          logo: data.logo || "",
          banner: data.banner || "",
          status: data.status || "",
          email: data.user?.email || "",
          name: data.user?.name || "",
          phone: data.phone || "",
          address: data.location?.address || "",
          city: data.location?.city || "",
          country: data.location?.country || "Nepal",
        });

        if (
          data.location?.latitude != null &&
          data.location?.longitude != null
        ) {
          setLocation({
            lat: Number(data.location.latitude),
            lng: Number(data.location.longitude),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    setSuccess("");
    try {
      const url = await uploadImage(file, accessToken);
      setForm((prev) => ({ ...prev, logo: url }));
    } catch (err) {
      setError(err.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setError("");
    setSuccess("");
    try {
      const url = await uploadImage(file, accessToken);
      setForm((prev) => ({ ...prev, banner: url }));
    } catch (err) {
      setError(err.message || "Banner upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  /* ---------- Location search ---------- */
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

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MarketplaceApp/1.0",
        },
      });

      if (!response.ok) throw new Error("Location search failed.");
      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        setSearchResults([]);
        setSearchError("No location found. Try a nearby landmark or place name.");
        return;
      }
      setSearchResults(results);
    } catch (err) {
      setSearchResults([]);
      setSearchError(err?.message || "Unable to search for this location.");
    } finally {
      setSearchingLocation(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLocation({ lat, lng });

    const addr = result.address || {};
    const displayName = result.display_name || "";
    const road = addr.road || addr.pedestrian || addr.footway || "";
    const houseNumber = addr.house_number || "";
    const neighbourhood =
      addr.neighbourhood || addr.suburb || addr.quarter || "";
    const resolvedCity =
      addr.city || addr.town || addr.municipality || addr.village || "";

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
      city: resolvedCity || prev.city,
      country: addr.country || "Nepal",
    }));

    setSearchQuery(displayName);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError("");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      setShowSearchResults(true);
      return;
    }

    setLocating(true);
    setSearchError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });

          const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: "json",
            addressdetails: "1",
          });

          const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
            headers: {
              Accept: "application/json",
              "User-Agent": "MarketplaceApp/1.0",
            },
          });

          if (response.ok) {
            const result = await response.json();
            selectSearchResult(result);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        let message = "Unable to get your location.";
        if (err.code === 1)
          message = "Location permission denied.";
        if (err.code === 2) message = "Location unavailable.";
        if (err.code === 3) message = "Location request timed out.";
        setSearchError(message);
        setShowSearchResults(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api("/vendors/me", {
        method: "PUT",
        accessToken,
        body: {
          storeName: form.storeName.trim(),
          storeDescription: form.storeDescription.trim(),
          logo: form.logo,
          banner: form.banner,
          phone: form.phone.trim(),
          location: {
            latitude: location.lat,
            longitude: location.lng,
            address: form.address.trim(),
            city: form.city.trim(),
            country: form.country.trim() || "Nepal",
          },
        },
      });

      setSuccess("Store profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store information, branding, and delivery location.
          </p>
        </div>
        {form.status && (
          <Badge variant="secondary" className="w-fit capitalize">
            {form.status}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Account Information</h2>
            <p className="text-sm text-muted-foreground">
              Your account details are managed separately.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Account</Label>
            <p className="text-sm text-muted-foreground">
              {form.name} · {form.email}
            </p>
          </div>
        </div>

        {/* Store info */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Store Information</h2>
            <p className="text-sm text-muted-foreground">
              This information can be shown to customers on your store page.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store name</Label>
              <Input
                id="storeName"
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                placeholder="Enter your store name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeDescription">Store description</Label>
              <textarea
                id="storeDescription"
                name="storeDescription"
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="Tell customers about your store"
                rows={5}
                className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9779812345678 (include country code)"
                required
              />
              <p className="text-xs text-muted-foreground">
                Include your country code, no spaces or symbols. Customers will
                see a &quot;Chat on WhatsApp&quot; button on your product pages.
              </p>
            </div>
          </div>
        </div>

        {/* Store location — critical for delivery fees */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Store Location</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Set your store pin accurately. Delivery fees are calculated from
              this location to the customer.
            </p>
          </div>

          <div className="relative mb-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchLocation();
                    }
                  }}
                  placeholder="Search place or landmark..."
                  className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
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
                  disabled={searchingLocation || locating}
                >
                  {searchingLocation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={useCurrentLocation}
                  disabled={locating || searchingLocation}
                >
                  {locating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="mr-2 h-4 w-4" />
                  )}
                  My location
                </Button>
              </div>
            </div>

            {showSearchResults && (
              <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-lg border bg-background shadow-xl">
                {searchingLocation && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                )}
                {!searchingLocation && searchError && (
                  <div className="px-4 py-3 text-sm text-destructive">
                    {searchError}
                  </div>
                )}
                {!searchingLocation &&
                  !searchError &&
                  searchResults.map((result, index) => (
                    <button
                      key={`${result.place_id}-${index}`}
                      type="button"
                      onClick={() => selectSearchResult(result)}
                      className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {result.name ||
                            result.display_name?.split(",")[0] ||
                            "Location"}
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

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street, area..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Kathmandu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Nepal"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={14}
              scrollWheelZoom
              style={{ height: "320px", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController location={location} />
              <LocationSelector location={location} setLocation={setLocation} />
            </MapContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Lat: {location.lat.toFixed(6)} · Lng: {location.lng.toFixed(6)} —
            click the map or drag the pin to adjust.
          </p>
        </div>

        {/* Logo */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Store Logo</h2>
            <p className="text-sm text-muted-foreground">
              Upload a square image for your store logo.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {form.logo ? (
              <img
                src={form.logo}
                alt="Store logo"
                className="h-24 w-24 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div>
              <Label
                htmlFor="logo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload logo
                  </>
                )}
              </Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo || saving}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended: square PNG/JPG image.
              </p>
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Store Banner</h2>
            <p className="text-sm text-muted-foreground">
              Upload a banner image that can be displayed on your store page.
            </p>
          </div>
          <div className="space-y-4">
            {form.banner ? (
              <img
                src={form.banner}
                alt="Store banner"
                className="h-40 w-full rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                No banner uploaded
              </div>
            )}
            <div>
              <Label
                htmlFor="banner"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {uploadingBanner ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload banner
                  </>
                )}
              </Label>
              <Input
                id="banner"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
                disabled={uploadingBanner || saving}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended: wide landscape image.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || uploadingLogo || uploadingBanner}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <DeleteAccountDialog description="You'll need to remove your products first (or have an admin reassign them) before you can delete your vendor account. This can't be undone." />
      </div>
    </div>
  );
}
