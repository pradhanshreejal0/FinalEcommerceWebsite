import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function VendorApprovals() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
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
    try {
      await api(`/vendors/${vendorId}/${action}`, {
        method: "PUT",
        accessToken,
      });
      setVendors((prev) => prev.filter((v) => v._id !== vendorId));
    } catch (err) {
      setActionError(err.message || "Something went wrong");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vendor Approvals</h1>

      {actionError && (
        <p className="text-sm text-destructive mb-4">{actionError}</p>
      )}

      {vendors.length === 0 ? (
        <p className="text-muted-foreground">No pending vendor requests.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <Card key={vendor._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{vendor.storeName}</CardTitle>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {vendor.user?.name}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {vendor.user?.email}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAction(vendor._id, "approve")}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAction(vendor._id, "reject")}
                  >
                    <X className="h-4 w-4 mr-1" />
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