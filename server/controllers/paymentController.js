import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { notifyEmail, orderSummaryHtml } from "../utils/notify.js";

const ONLINE_METHODS = ["esewa", "khalti"];

const getClientBaseUrl = () => {
  const raw = process.env.CLIENT_URL || "http://localhost:5173";
  return String(raw).replace(/^["']|["']$/g, "").replace(/\/$/, "");
};

const getOrderForPayment = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(order.user) !== String(userId)) {
    const err = new Error("Not authorized for this order");
    err.statusCode = 403;
    throw err;
  }
  return order;
};

const assertPayable = (order, method) => {
  if (!ONLINE_METHODS.includes(method)) {
    const err = new Error("Invalid online payment method");
    err.statusCode = 400;
    throw err;
  }
  if (order.paymentStatus === "paid") {
    const err = new Error("Order is already paid");
    err.statusCode = 400;
    throw err;
  }
  if (order.status === "cancelled") {
    const err = new Error("Cannot pay a cancelled order");
    err.statusCode = 400;
    throw err;
  }
};

/** eSewa ePay v2 signature (HMAC-SHA256 → base64) */
const signEsewa = (message, secret) =>
  crypto.createHmac("sha256", secret).update(message).digest("base64");

/**
 * POST /api/payments/initiate
 * Body: { orderId, paymentMethod: "esewa" | "khalti" }
 */
export const initiatePayment = async (req, res) => {
  try {
    const orderId = req.body.orderId || req.params.id;
    const paymentMethod = String(
      req.body.paymentMethod || req.body.method || ""
    ).toLowerCase();

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await getOrderForPayment(orderId, req.user._id);
    assertPayable(order, paymentMethod);

    // Keep method in sync if user switches on pay page
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod;
      await order.save();
    }

    const amount = Number(order.totalAmount) || 0;
    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid order amount" });
    }

    const clientUrl = getClientBaseUrl();
    const successUrl = `${clientUrl}/payment/success?orderId=${order._id}&method=${paymentMethod}`;
    const failureUrl = `${clientUrl}/payment/failure?orderId=${order._id}&method=${paymentMethod}`;

    if (paymentMethod === "esewa") {
      const productCode =
        process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_CODE;
      const secret =
        process.env.ESEWA_SECRET_KEY || process.env.ESEWA_SECRET;

      if (!productCode || !secret) {
        return res.status(503).json({
          message:
            "eSewa is not configured on the server. Set ESEWA_PRODUCT_CODE and ESEWA_SECRET_KEY.",
        });
      }

      const transactionUuid = `${order._id}-${Date.now()}`;
      const totalAmount = amount.toFixed(2);
      const taxAmount = "0";
      const productServiceCharge = "0";
      const productDeliveryCharge = "0";

      // Fields eSewa requires in the signature
      const signedFieldNames = "total_amount,transaction_uuid,product_code";
      const signaturePayload = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
      const signature = signEsewa(signaturePayload, secret);

      const formFields = {
        amount: totalAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        product_service_charge: productServiceCharge,
        product_delivery_charge: productDeliveryCharge,
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: signedFieldNames,
        signature,
      };

      order.paymentTransactionId = transactionUuid;
      order.paymentProviderData = { provider: "esewa", transactionUuid };
      await order.save();

      const isLive =
        String(process.env.ESEWA_ENV || "test").toLowerCase() === "live";
      const formAction = isLive
        ? "https://epay.esewa.com.np/api/epay/main/v2/form"
        : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

      return res.json({
        provider: "esewa",
        formAction,
        formFields,
        orderId: order._id,
        amount,
      });
    }

    if (paymentMethod === "khalti") {
      const secretKey = process.env.KHALTI_SECRET_KEY;
      if (!secretKey) {
        return res.status(503).json({
          message:
            "Khalti is not configured on the server. Set KHALTI_SECRET_KEY.",
        });
      }

      const isLive =
        String(process.env.KHALTI_ENV || "test").toLowerCase() === "live";
      const initiateUrl = isLive
        ? "https://khalti.com/api/v2/epayment/initiate/"
        : "https://dev.khalti.com/api/v2/epayment/initiate/";

      const amountPaisa = Math.round(amount * 100);
      const payload = {
        return_url: successUrl,
        website_url: clientUrl,
        amount: amountPaisa,
        purchase_order_id: String(order._id),
        purchase_order_name: order.orderNumber || `Order ${order._id}`,
        customer_info: {
          name: order.shippingAddress?.fullName || "Customer",
          email: req.user.email || undefined,
          phone: order.shippingAddress?.phone || undefined,
        },
      };

      const khaltiRes = await fetch(initiateUrl, {
        method: "POST",
        headers: {
          Authorization: `Key ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await khaltiRes.json().catch(() => ({}));

      if (!khaltiRes.ok) {
        console.error("Khalti initiate error:", data);
        return res.status(502).json({
          message:
            data?.detail ||
            data?.error_key ||
            "Failed to start Khalti payment",
          providerError: data,
        });
      }

      order.paymentTransactionId = data.pidx || "";
      order.paymentProviderData = {
        provider: "khalti",
        pidx: data.pidx,
      };
      await order.save();

      return res.json({
        provider: "khalti",
        paymentUrl: data.payment_url,
        pidx: data.pidx,
        orderId: order._id,
        amount,
      });
    }

    return res.status(400).json({ message: "Unsupported payment method" });
  } catch (error) {
    console.error("Initiate payment error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to initiate payment",
    });
  }
};

/**
 * POST /api/orders/:id/pay  (alias)
 */
export const payOrder = async (req, res) => {
  req.body = {
    ...req.body,
    orderId: req.params.id,
    paymentMethod: req.body.paymentMethod || req.body.method,
  };
  return initiatePayment(req, res);
};

/**
 * POST /api/orders/:id/verify-payment
 * Body: gateway callback fields (pidx, data, transaction_uuid, ...)
 */
export const verifyPayment = async (req, res) => {
  try {
    const order = await getOrderForPayment(req.params.id, req.user._id);

    if (order.paymentStatus === "paid") {
      return res.json({
        success: true,
        message: "Already paid",
        order,
      });
    }

    const method = String(
      req.body.paymentMethod || order.paymentMethod || ""
    ).toLowerCase();

    if (method === "khalti") {
      const secretKey = process.env.KHALTI_SECRET_KEY;
      if (!secretKey) {
        return res.status(503).json({ message: "Khalti is not configured" });
      }

      const pidx =
        req.body.pidx ||
        order.paymentProviderData?.pidx ||
        order.paymentTransactionId;

      if (!pidx) {
        return res.status(400).json({
          message: "Missing Khalti pidx for verification",
        });
      }

      const isLive =
        String(process.env.KHALTI_ENV || "test").toLowerCase() === "live";
      const lookupUrl = isLive
        ? "https://khalti.com/api/v2/epayment/lookup/"
        : "https://dev.khalti.com/api/v2/epayment/lookup/";

      const lookupRes = await fetch(lookupUrl, {
        method: "POST",
        headers: {
          Authorization: `Key ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pidx }),
      });

      const lookup = await lookupRes.json().catch(() => ({}));

      if (!lookupRes.ok) {
        return res.status(502).json({
          message: "Khalti verification failed",
          providerError: lookup,
        });
      }

      // Completed | Pending | Refunded | Expired | User canceled
      if (lookup.status === "Completed") {
        const expectedPaisa = Math.round(Number(order.totalAmount) * 100);
        if (
          lookup.total_amount != null &&
          Number(lookup.total_amount) !== expectedPaisa
        ) {
          order.paymentStatus = "failed";
          await order.save();
          return res.status(400).json({
            message: "Paid amount does not match order total",
          });
        }

        order.paymentStatus = "paid";
        order.paymentProviderData = {
          ...(order.paymentProviderData || {}),
          lookup,
        };
        await order.save();
        try {
          const u = await User.findById(order.user).select("email");
          if (u?.email) {
            notifyEmail({
              to: u.email,
              subject: `Payment received — ${order.orderNumber}`,
              html: orderSummaryHtml(order, "Payment confirmed"),
            });
          }
        } catch {}
        return res.json({ success: true, order, provider: "khalti" });
      }

      if (lookup.status === "Pending") {
        return res.json({
          success: false,
          message: "Payment still pending",
          status: lookup.status,
        });
      }

      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({
        success: false,
        message: `Payment status: ${lookup.status || "failed"}`,
      });
    }

    if (method === "esewa") {
      const productCode =
        process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_CODE;
      const secret =
        process.env.ESEWA_SECRET_KEY || process.env.ESEWA_SECRET;

      if (!productCode || !secret) {
        return res.status(503).json({ message: "eSewa is not configured" });
      }

      // eSewa returns encoded `data` on success_url — prefer server status check
      const transactionUuid =
        req.body.transaction_uuid ||
        req.body.transactionUuid ||
        order.paymentTransactionId;

      const totalAmount = Number(order.totalAmount).toFixed(2);

      const isLive =
        String(process.env.ESEWA_ENV || "test").toLowerCase() === "live";
      const statusUrl = isLive
        ? "https://epay.esewa.com.np/api/epay/transaction/status/"
        : "https://rc-epay.esewa.com.np/api/epay/transaction/status/";

      const params = new URLSearchParams({
        product_code: productCode,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
      });

      const statusRes = await fetch(`${statusUrl}?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const statusData = await statusRes.json().catch(() => ({}));

      // COMPLETE | PENDING | FULL_REFUND | PARTIAL_REFUND | AMBIGUOUS | NOT_FOUND | CANCELED
      if (
        statusData.status === "COMPLETE" ||
        statusData.status === "COMPLETE_PAYMENT"
      ) {
        order.paymentStatus = "paid";
        order.paymentProviderData = {
          ...(order.paymentProviderData || {}),
          status: statusData,
        };
        await order.save();
        try {
          const u = await User.findById(order.user).select("email");
          if (u?.email) {
            notifyEmail({
              to: u.email,
              subject: `Payment received — ${order.orderNumber}`,
              html: orderSummaryHtml(order, "Payment confirmed"),
            });
          }
        } catch {}
        return res.json({ success: true, order, provider: "esewa" });
      }

      if (statusData.status === "PENDING") {
        return res.json({
          success: false,
          message: "Payment still pending",
          status: statusData.status,
        });
      }

      // Fallback: if client sent signed success payload, still mark carefully
      // only after status API confirms — do not trust client alone.
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({
        success: false,
        message: `eSewa status: ${statusData.status || "unknown"}`,
        providerError: statusData,
      });
    }

    return res.status(400).json({ message: "Unsupported payment method" });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to verify payment",
    });
  }
};
