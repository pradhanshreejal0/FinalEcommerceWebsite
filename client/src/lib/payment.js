import { api } from "@/lib/api";

/** Human-readable payment method labels */
export const PAYMENT_METHOD_LABELS = {
  cod: "Cash on Delivery",
  esewa: "eSewa",
  khalti: "Khalti",
};

export function getPaymentMethodLabel(method) {
  if (!method) return "—";
  const key = String(method).toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || method;
}

export function isOnlinePayment(method) {
  const key = String(method || "").toLowerCase();
  return key === "esewa" || key === "khalti";
}

/**
 * Ask the backend to start an online payment for an order.
 * Expected response shapes (any of these work):
 *   { paymentUrl }
 *   { url }
 *   { redirectUrl }
 *   { formAction, formFields }  // eSewa-style auto-submit form
 *   { pidx, payment_url }       // Khalti ePayment
 */
export async function initiatePayment(orderId, paymentMethod, accessToken) {
  if (!orderId) throw new Error("Order ID is required to start payment.");

  // One canonical endpoint. The old code retried other (partly non-existent) routes,
  // which could start a payment twice and hid the real server error behind a 404.
  const data = await api("/payments/initiate", {
    method: "POST",
    accessToken,
    body: { orderId, paymentMethod },
  });
  if (!data) throw new Error("Online payment could not be started. Please try again or use Cash on Delivery.");
  return data;
}

/**
 * Redirect the browser to the payment gateway using whatever the backend returned.
 * Returns true if a redirect/form-submit was triggered.
 */
export function redirectToPaymentGateway(paymentData) {
  if (!paymentData || typeof paymentData !== "object") return false;

  const url =
    paymentData.paymentUrl ||
    paymentData.payment_url ||
    paymentData.redirectUrl ||
    paymentData.url ||
    paymentData.checkoutUrl;

  // eSewa-style form post
  if (paymentData.formAction && paymentData.formFields) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentData.formAction;
    form.style.display = "none";

    Object.entries(paymentData.formFields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value == null ? "" : String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    return true;
  }

  if (url && typeof url === "string") {
    window.location.href = url;
    return true;
  }

  return false;
}

/**
 * Optional client-side Khalti Checkout (requires VITE_KHALTI_PUBLIC_KEY).
 * Loads the Khalti script once, then opens the widget.
 */
let khaltiScriptPromise = null;

function loadKhaltiScript() {
  if (window.KhaltiCheckout) return Promise.resolve();
  if (khaltiScriptPromise) return khaltiScriptPromise;

  khaltiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-khalti="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://khalti.s3.ap-south-1.amazonaws.com/Kpg/dist/2020.11.12.0.0/khalti-checkout.iffe.js";
    script.async = true;
    script.dataset.khalti = "1";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Khalti payment script."));
    document.body.appendChild(script);
  });

  return khaltiScriptPromise;
}

/**
 * Open Khalti payment widget.
 * amountPaisa = total in paisa (NPR * 100)
 */
export async function openKhaltiCheckout({
  amountPaisa,
  orderId,
  productName,
  onSuccess,
  onError,
  onClose,
}) {
  const publicKey = import.meta.env.VITE_KHALTI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(
      "Khalti is not configured. Set VITE_KHALTI_PUBLIC_KEY or use backend payment initiate."
    );
  }

  await loadKhaltiScript();

  if (!window.KhaltiCheckout) {
    throw new Error("Khalti Checkout is unavailable.");
  }

  const config = {
    publicKey,
    productIdentity: String(orderId),
    productName: productName || `Order ${orderId}`,
    productUrl: window.location.origin,
    eventHandler: {
      onSuccess(payload) {
        onSuccess?.(payload);
      },
      onError(error) {
        onError?.(error);
      },
      onClose() {
        onClose?.();
      },
    },
    paymentPreference: [
      "KHALTI",
      "EBANKING",
      "MOBILE_BANKING",
      "CONNECT_IPS",
      "SCT",
    ],
  };

  const checkout = new window.KhaltiCheckout(config);
  checkout.show({ amount: Math.round(amountPaisa) });
  return checkout;
}
