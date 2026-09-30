import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Store, Mail, Phone, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function VendorApprovals() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadVendors = async () => {
      try {
        const data = await api("/vendors/pending", { accessToken });
        if (!cancelled) {
          setVendors(data);
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(err.message || "Failed to load vendors");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadVendors();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleAction = async (vendorId, action) => {
    setActionError("");
    setBusyId(vendorId);
    try {
      await api(`/vendors/${vendorId}/${action}`, {
        method: "PUT",
        accessToken,
      });
      setVendors((prev) => prev.filter((v) => v._id !== vendorId));
    } catch (err) {
      setActionError(err.message || "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading pending vendors…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Vendor Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review new store applications. Approving notifies the vendor by email.
        </p>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {vendors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">No pending requests</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New vendor registrations will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vendors.map((vendor) => (
            <Card key={vendor._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">
                      {vendor.storeName}
                    </CardTitle>
                    <CardDescription className="mt-0.5 truncate">
                      /store/{vendor.storeSlug}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">{vendor.user?.name || "—"}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.user?.email || "—"}</span>
                  </p>
                  {(vendor.phone || vendor.user?.phone) && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {vendor.phone || vendor.user?.phone}
                    </p>
                  )}
                  {vendor.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Applied{" "}
                      {new Date(vendor.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busyId === vendor._id}
                    onClick={() => handleAction(vendor._id, "approve")}
                  >
                    {busyId === vendor._id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={busyId === vendor._id}
                    onClick={() => handleAction(vendor._id, "reject")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
