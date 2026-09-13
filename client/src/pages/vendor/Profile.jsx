import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";

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
  });

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api("/vendors/me", {
          accessToken,
        });

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
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const url = await uploadImage(file, accessToken);

      setForm((prev) => ({
        ...prev,
        logo: url,
      }));
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

      setForm((prev) => ({
        ...prev,
        banner: url,
      }));
    } catch (err) {
      setError(err.message || "Banner upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
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
        body: JSON.stringify({
          storeName: form.storeName.trim(),
          storeDescription: form.storeDescription.trim(),
          logo: form.logo,
          banner: form.banner,
          phone: form.phone.trim(),
        }),
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
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Store Profile
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage your store information and branding.
          </p>
        </div>

        {form.status && (
          <Badge variant="secondary" className="w-fit capitalize">
            {form.status}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Information */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Account Information
            </h2>

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

        {/* Store Information */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Store Information
            </h2>

            <p className="text-sm text-muted-foreground">
              This information can be shown to customers on your store page.
            </p>
          </div>

          <div className="space-y-5">
            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store name
              </Label>

              <Input
                id="storeName"
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                placeholder="Enter your store name"
                required
              />
            </div>

            {/* Store Description */}
            <div className="space-y-2">
              <Label htmlFor="storeDescription">
                Store description
              </Label>

              <textarea
                id="storeDescription"
                name="storeDescription"
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="Tell customers about your store"
                rows={5}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* WhatsApp Number (Now safely nested inside Store Information) */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                WhatsApp number
              </Label>

              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9779812345678 (include country code)"
              />

              <p className="text-xs text-muted-foreground">
                Include your country code, no spaces or symbols. Customers
                will see a "Chat on WhatsApp" button on your product pages
                that messages this number directly.
              </p>
            </div>
          </div>
        </div>

        {/* Store Logo */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Store Logo
            </h2>

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

        {/* Store Banner */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Store Banner
            </h2>

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

        {/* Messages */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              saving ||
              uploadingLogo ||
              uploadingBanner
            }
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
    </div>
  );
}