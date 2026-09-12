import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Settings() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    commissionPercentage: 10,
    platformName: "",
    supportEmail: "",
    lowStockThreshold: 5,
  });

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const data = await api("/settings", { accessToken });
        if (!cancelled) {
          setForm({
            commissionPercentage: data.commissionPercentage,
            platformName: data.platformName,
            supportEmail: data.supportEmail,
            lowStockThreshold: data.lowStockThreshold,
          });
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await api("/settings", {
        method: "PUT",
        accessToken,
        body: JSON.stringify(form),
      });

      setForm({
        commissionPercentage: updated.commissionPercentage,
        platformName: updated.platformName,
        supportEmail: updated.supportEmail,
        lowStockThreshold: updated.lowStockThreshold,
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <p className="text-xs text-muted-foreground">
                Percentage of each order taken as platform commission from vendors.
              </p>
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
              <p className="text-xs text-muted-foreground">
                Vendors are alerted when a product's stock falls at or below this number.
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>

            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}