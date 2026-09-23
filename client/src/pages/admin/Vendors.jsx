import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

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

// Default map center: Kathmandu
const DEFAULT_POSITION = { lat: 27.7172, lng: 85.324 };
const DEFAULT_ZOOM = 13;

const statusVariant = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

/* ============================================================
   MAP HELPERS (same pattern as Checkout.jsx)
============================================================ */

function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), {
      duration: 0.8,
    });
  }, [position, map]);
  return null;
}

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      setPosition({ lat, lng });
    },
  });

  if (!position) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable
      eventHandlers={{
        dragend(event) {
          const newPos = event.target.getLatLng();
          setPosition({ lat: newPos.lat, lng: newPos.lng });
        },
      }}
    />
  );
}

/* ============================================================
   SET LOCATION DIALOG (with place search)
============================================================ */

function LocationDialog({ vendor, open, onOpenChange, accessToken, onSaved }) {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Nepal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    const loc = vendor.location;
    setPosition(
      loc?.latitude != null && loc?.longitude != null
        ? { lat: loc.latitude, lng: loc.longitude }
        : DEFAULT_POSITION
    );
    setAddress(loc?.address || "");
    setCity(loc?.city || "");
    setCountry(loc?.country || "Nepal");
    setError("");
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowSearchResults(false);
  }, [vendor]);

  /* ---------- Search ---------- */

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

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

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
      console.error("Location search error:", err);
      setSearchResults([]);
      setSearchError(err?.message || "Unable to search for this location.");
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocation();
    }
  };

  const selectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setPosition({ lat, lng });

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

    setAddress(generatedAddress || address);
    setCity(resolvedCity || city);
    setCountry(addr.country || "Nepal");

    setSearchQuery(displayName);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError("");
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowSearchResults(false);
  };

  /* ---------- Save ---------- */

  const handleSave = async () => {
    if (!position) return;
    setSaving(true);
    setError("");
    try {
      await api(`/vendors/${vendor._id}/location`, {
        method: "PUT",
        accessToken,
        body: {
          latitude: position.lat,
          longitude: position.lng,
          address,
          city,
          country,
        },
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set location — {vendor?.storeName}</DialogTitle>
        </DialogHeader>

        {/* Search box */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setShowSearchResults(false);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                placeholder="Search place or landmark..."
                className="w-full rounded-md border bg-background py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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

            <Button type="button" onClick={searchLocation} disabled={searchingLocation}>
              {searchingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showSearchResults && (
            <div className="absolute left-0 right-0 top-full z-2000 mt-2 overflow-hidden rounded-lg border bg-background shadow-xl">
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
                <div className="max-h-60 overflow-y-auto">
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

        {position && (
          <div className="h-64 w-full overflow-hidden rounded-md border">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={DEFAULT_ZOOM}
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <LocationPicker position={position} setPosition={setPosition} />
              <MapController position={position} />
            </MapContainer>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Search, click the map, or drag the marker to set the exact spot.
          {position && (
            <>
              {" "}
              Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
            </>
          )}
        </p>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street / area"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            Save location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   ADD VENDOR DIALOG
============================================================ */

function CreateVendorDialog({ open, onOpenChange, accessToken, onCreated }) {
  const emptyForm = {
    name: "",
    email: "",
    password: "",
    storeName: "",
    phone: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setError("");
    }
  }, [open]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async () => {
    setError("");

    if (!form.name.trim()) return setError("Name is required");
    if (!form.email.trim()) return setError("Email is required");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (!form.storeName.trim()) return setError("Store name is required");
    if (!form.phone.trim()) return setError("Phone number is required");

    setSaving(true);
    try {
      await api("/vendors", {
        method: "POST",
        accessToken,
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          storeName: form.storeName.trim(),
          phone: form.phone.trim(),
        },
      });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="name">Owner name</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <Label htmlFor="storeName">Store name</Label>
            <Input
              id="storeName"
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Include country code"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeVendor, setActiveVendor] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { accessToken } = useAuth();

  const loadVendors = async () => {
    try {
      const data = await api("/vendors", { accessToken });
      setVendors(data);
    } catch (err) {
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadVendors();
  }, [accessToken]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Vendors</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Add Vendor</Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {vendors.length === 0 ? (
        <p className="text-muted-foreground">No vendors yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => {
            const hasLocation =
              vendor.location?.latitude != null &&
              vendor.location?.longitude != null;

            return (
              <Card key={vendor._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {vendor.storeName}
                    </CardTitle>
                    <Badge variant={statusVariant[vendor.status] || "secondary"}>
                      {vendor.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {vendor.user?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {vendor.user?.email}
                  </p>

                  <p className="text-xs mb-4 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {hasLocation
                      ? `${vendor.location.city || "Location set"}`
                      : "Location not set"}
                  </p>

                  <Button
                    size="sm"
                    variant={hasLocation ? "outline" : "default"}
                    className="w-full"
                    onClick={() => setActiveVendor(vendor)}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    {hasLocation ? "Update location" : "Set location"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LocationDialog
        vendor={activeVendor}
        open={!!activeVendor}
        onOpenChange={(open) => !open && setActiveVendor(null)}
        accessToken={accessToken}
        onSaved={loadVendors}
      />

      <CreateVendorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accessToken={accessToken}
        onCreated={loadVendors}
      />
    </div>
  );
}
