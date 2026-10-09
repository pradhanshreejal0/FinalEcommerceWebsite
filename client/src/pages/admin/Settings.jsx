import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { uploadImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";

const DEFAULT_HERO = {
  visible: true,
  kicker: "The good find starts here",
  title: "Find your everyday, elevated.",
  subtitle:
    "Considered finds for the way you live, work, move and make a home.",
  ctaText: "Shop the collection",
  ctaLink: "/products",
  imageUrl:
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1900",
  captionLeft: "Made for everyday",
  captionRight: "01 / 04",
};

const DEFAULT_PROMO = {
  visible: true,
  badge: "THE FOUNDRY EDIT",
  title: "Good design\nis for living.",
  subtitle: "Meet pieces with a little more thought behind them.",
  ctaText: "Shop the edit",
  ctaLink: "/products",
  imageUrl:
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
};

export default function Settings() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);

  const [form, setForm] = useState({
    commissionPercentage: 10,
    platformName: "Foundry",
    supportEmail: "",
    lowStockThreshold: 5,
    hero: { ...DEFAULT_HERO },
    promo: { ...DEFAULT_PROMO },
  });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const data = await api("/settings", { accessToken });
        if (cancelled) return;
        setForm({
          commissionPercentage: data.commissionPercentage ?? 10,
          platformName: data.platformName ?? "Foundry",
          supportEmail: data.supportEmail ?? "",
          lowStockThreshold: data.lowStockThreshold ?? 5,
          hero: { ...DEFAULT_HERO, ...(data.hero || {}) },
          promo: { ...DEFAULT_PROMO, ...(data.promo || {}) },
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleHeroChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({
      ...prev,
      hero: { ...prev.hero, [field]: value },
    }));
  };

  const handlePromoChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({
      ...prev,
      promo: { ...prev.promo, [field]: value },
    }));
  };

  const handleImageUpload = async (file, kind) => {
    if (!file || !accessToken) return;
    const setUploading = kind === "hero" ? setUploadingHero : setUploadingPromo;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, accessToken);
      setForm((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], imageUrl: url },
      }));
    } catch (err) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await api("/settings", {
        method: "PUT",
        accessToken,
        body: {
          commissionPercentage: Number(form.commissionPercentage),
          platformName: form.platformName,
          supportEmail: form.supportEmail,
          lowStockThreshold: Number(form.lowStockThreshold),
          hero: form.hero,
          promo: form.promo,
        },
      });

      setForm({
        commissionPercentage: updated.commissionPercentage,
        platformName: updated.platformName,
        supportEmail: updated.supportEmail,
        lowStockThreshold: updated.lowStockThreshold,
        hero: { ...DEFAULT_HERO, ...(updated.hero || {}) },
        promo: { ...DEFAULT_PROMO, ...(updated.promo || {}) },
      });
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          General platform config and homepage storefront content (admin only).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Platform-wide business settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={form.platformName}
                onChange={handleChange("platformName")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={handleChange("supportEmail")}
                placeholder="support@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionPercentage">
                Commission Percentage (%)
              </Label>
              <Input
                id="commissionPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionPercentage}
                onChange={handleChange("commissionPercentage")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={handleChange("lowStockThreshold")}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Hero */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage Hero</CardTitle>
            <CardDescription>
              Large banner at the top of the home page. Only admins can change
              this.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.hero.visible}
                onChange={handleHeroChange("visible")}
                className="size-4 accent-primary"
              />
              Show hero section
            </label>

            <div className="space-y-2">
              <Label>Hero image</Label>
              {form.hero.imageUrl && (
                <img
                  src={form.hero.imageUrl}
                  alt="Hero preview"
                  className="h-36 w-full rounded-md object-cover border"
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={form.hero.imageUrl || ""}
                  onChange={handleHeroChange("imageUrl")}
                  placeholder="Image URL"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  {uploadingHero ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingHero}
                    onChange={(e) =>
                      handleImageUpload(e.target.files?.[0], "hero")
                    }
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kicker</Label>
                <Input
                  value={form.hero.kicker || ""}
                  onChange={handleHeroChange("kicker")}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA text</Label>
                <Input
                  value={form.hero.ctaText || ""}
                  onChange={handleHeroChange("ctaText")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.hero.title || ""}
                onChange={handleHeroChange("title")}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={form.hero.subtitle || ""}
                onChange={handleHeroChange("subtitle")}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>CTA link</Label>
                <Input
                  value={form.hero.ctaLink || ""}
                  onChange={handleHeroChange("ctaLink")}
                  placeholder="/products"
                />
              </div>
              <div className="space-y-2">
                <Label>Caption left</Label>
                <Input
                  value={form.hero.captionLeft || ""}
                  onChange={handleHeroChange("captionLeft")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promo band */}
        <Card>
          <CardHeader>
            <CardTitle>Promo Band</CardTitle>
            <CardDescription>
              Split “Foundry Edit” section mid-page. Admin only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.promo.visible}
                onChange={handlePromoChange("visible")}
                className="size-4 accent-primary"
              />
              Show promo band
            </label>

            <div className="space-y-2">
              <Label>Promo image</Label>
              {form.promo.imageUrl && (
                <img
                  src={form.promo.imageUrl}
                  alt="Promo preview"
                  className="h-36 w-full rounded-md object-cover border"
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={form.promo.imageUrl || ""}
                  onChange={handlePromoChange("imageUrl")}
                  placeholder="Image URL"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  {uploadingPromo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingPromo}
                    onChange={(e) =>
                      handleImageUpload(e.target.files?.[0], "promo")
                    }
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Badge</Label>
                <Input
                  value={form.promo.badge || ""}
                  onChange={handlePromoChange("badge")}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA text</Label>
                <Input
                  value={form.promo.ctaText || ""}
                  onChange={handlePromoChange("ctaText")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title (use line breaks with Enter)</Label>
              <Textarea
                value={form.promo.title || ""}
                onChange={handlePromoChange("title")}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={form.promo.subtitle || ""}
                onChange={handlePromoChange("subtitle")}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>CTA link</Label>
              <Input
                value={form.promo.ctaLink || ""}
                onChange={handlePromoChange("ctaLink")}
                placeholder="/products"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save all settings"}
          </Button>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </div>
  );
}
