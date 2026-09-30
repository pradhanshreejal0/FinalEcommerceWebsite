import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { getPaymentMethodLabel } from "@/lib/payment";

/**
 * Shared success / failure landing page after gateway redirect.
 * Routes:
 *   /payment/success
 *   /payment/failure
 * Query: orderId, method, and any gateway params (refId, status, pidx, ...)
 */
export default function PaymentResult() {
  const { result } = useParams(); // "success" | "failure"
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();

  const orderId = searchParams.get("orderId") || searchParams.get("oid") || "";
  const method =
    searchParams.get("method") ||
    searchParams.get("paymentMethod") ||
    "";

  const isSuccess = result === "success";

  const [verifying, setVerifying] = useState(isSuccess && !!orderId);
  const [verifyMsg, setVerifyMsg] = useState("");

  // Collect gateway callback params for server verification
  const gatewayPayload = useMemo(() => {
    const payload = {};
    searchParams.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }, [searchParams]);

  useEffect(() => {
    if (!isSuccess || !orderId || !accessToken) {
      setVerifying(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setVerifying(true);
        await api(`/orders/${orderId}/verify-payment`, {
          method: "POST",
          accessToken,
          body: {
            paymentMethod: method || undefined,
            ...gatewayPayload,
          },
        });
        if (!cancelled) setVerifyMsg("Payment verified successfully.");
      } catch (err) {
        // Soft-fail: order page still shows server paymentStatus
        if (!cancelled) {
          setVerifyMsg(
            err?.message ||
              "We received your payment response. Status will update shortly."
          );
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, orderId, accessToken, method, gatewayPayload]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {verifying ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Confirming payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please wait while we verify your transaction.
          </p>
        </>
      ) : isSuccess ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Payment successful
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you! Your online payment
            {method ? ` via ${getPaymentMethodLabel(method)}` : ""} was
            received.
          </p>
          {verifyMsg && (
            <p className="mt-2 text-xs text-muted-foreground">{verifyMsg}</p>
          )}
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Payment failed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The payment was cancelled or did not complete. You can try again
            from your order page.
          </p>
        </>
      )}

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {orderId && (
          <Button asChild size="lg">
            <Link to={`/orders/${orderId}`}>
              <Package className="mr-2 h-4 w-4" />
              View order
            </Link>
          </Button>
        )}
        {!isSuccess && orderId && (
          <Button asChild variant="outline" size="lg">
            <Link to={`/orders/${orderId}/pay`}>
              Try again
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link to="/orders">All orders</Link>
        </Button>
      </div>
    </main>
  );
}
