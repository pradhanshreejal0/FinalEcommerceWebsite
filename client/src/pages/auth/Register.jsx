import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Eye, EyeOff, Store, User } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "customer",
    storeName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.role === "vendor" && !formData.storeName.trim()) {
      setError("Store name is required for vendor registration");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      };

      if (formData.role === "vendor") {
        payload.storeName = formData.storeName.trim();
      }

      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      login(data.user, data.accessToken);

      if (data.user.role === "vendor") {
        navigate("/vendor");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const isVendor = formData.role === "vendor";

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/40 to-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Shop as a customer or open a store to sell on the marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role pills */}
            <div className="space-y-2">
              <Label>I want to</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "customer" })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition ${
                    !isVendor
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Buy products</span>
                  <span className="text-xs opacity-80">Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "vendor" })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition ${
                    isVendor
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Store className="h-5 w-5" />
                  <span className="font-medium">Sell products</span>
                  <span className="text-xs opacity-80">Vendor</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                placeholder="e.g. 97798XXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {isVendor && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  name="storeName"
                  required
                  placeholder="Your shop or brand name"
                  value={formData.storeName}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Your store is reviewed by an admin before you can sell. You’ll
                  get an email when it’s approved.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading
                ? "Creating account..."
                : isVendor
                  ? "Register as Vendor"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
