import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  initiatePayment,
  redirectToPaymentGateway,
  openKhaltiCheckout,
  getPaymentMethodLabel,
  isOnlinePayment,
} from "@/lib/payment";

export default function OrderPay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accessToken } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(
    location.state?.paymentError || ""
  );
  const [method, setMethod] = useState("esewa");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await api(`/orders/${id}`, { accessToken });
        if (cancelled) return;
        setOrder(data);
        if (data?.paymentMethod && isOnlinePayment(data.paymentMethod)) {
          setMethod(data.paymentMethod);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, accessToken, navigate]);

  const alreadyPaid =
    order?.paymentStatus === "paid" ||
    order?.paymentStatus === "completed" ||
    order?.paymentStatus === "success";

  const startPayment = async (selectedMethod) => {
    if (!order?._id || !accessToken) return;
    setError("");
    setPaying(true);
    setMethod(selectedMethod);

    try {
      // Prefer backend-driven gateway session
      try {
        const paymentData = await initiatePayment(
          order._id,
          selectedMethod,
          accessToken
        );
        if (redirectToPaymentGateway(paymentData)) {
          return;
        }
      } catch (initiateErr) {
        // Fall through to client Khalti if configured
        if (
          selectedMethod !== "khalti" ||
          !import.meta.env.VITE_KHALTI_PUBLIC_KEY
        ) {
          throw initiateErr;
        }
      }

      if (
        selectedMethod === "khalti" &&
        import.meta.env.VITE_KHALTI_PUBLIC_KEY
      ) {
        const amount = Number(order.totalAmount) || 0;
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
              navigate(
                `/payment/success?orderId=${order._id}&method=khalti`,
                { replace: true }
              );
            }
          },
          onError: () => {
            navigate(
              `/payment/failure?orderId=${order._id}&method=khalti`,
              { replace: true }
            );
          },
          onClose: () => setPaying(false),
        });
        return;
      }

      setError(
        "Payment gateway is not fully configured yet. Please ensure the backend exposes /payments/initiate, or set VITE_KHALTI_PUBLIC_KEY for Khalti."
      );
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to start payment. Please try again or choose Cash on Delivery on a new order."
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading payment...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button asChild className="mt-6">
          <Link to="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="mt-4 text-lg font-semibold">Payment already completed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This order is marked as paid.
        </p>
        <Button asChild className="mt-6">
          <Link to={`/orders/${order._id}`}>View order</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <Link
        to={`/orders/${order._id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to order
      </Link>

      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Complete payment
            </h1>
            <p className="text-sm text-muted-foreground">
              Order #{String(order._id).slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-muted/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount due</span>
            <span className="text-lg font-bold">
              RS {Number(order.totalAmount || 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Selected method</span>
            <span className="font-medium">
              {getPaymentMethodLabel(order.paymentMethod || method)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="capitalize">{order.paymentStatus || "pending"}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            disabled={paying}
            onClick={() => startPayment("esewa")}
          >
            {paying && method === "esewa" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Pay with eSewa
          </Button>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700"
            size="lg"
            disabled={paying}
            onClick={() => startPayment("khalti")}
          >
            {paying && method === "khalti" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Pay with Khalti
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You will be redirected to a secure payment page. Do not close the
          browser until payment is finished.
        </p>
      </div>
    </main>
  );
}
