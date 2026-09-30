import { sendEmail } from "./sendEmail.js";

/**
 * Fire-and-forget email. Never throws to callers (order flow must not fail
 * because SMTP is down).
 */
export async function notifyEmail({ to, subject, html }) {
  if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("[notify] skip email (missing to or EMAIL_USER/PASS):", subject);
    return { skipped: true };
  }
  try {
    await sendEmail({ to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error("[notify] email failed:", err?.message || err);
    return { ok: false, error: err?.message };
  }
}

export function orderSummaryHtml(order, title) {
  const items = (order.items || [])
    .map(
      (i) =>
        `<li>${i.title} × ${i.quantity} — RS ${Number(i.subtotal || 0).toFixed(2)} <em>(${i.status})</em></li>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:560px">
      <h2>${title}</h2>
      <p>Order <strong>${order.orderNumber || order._id}</strong></p>
      <p>Total: <strong>RS ${Number(order.totalAmount || 0).toFixed(2)}</strong></p>
      <p>Payment: ${order.paymentMethod} (${order.paymentStatus})</p>
      <ul>${items}</ul>
      <p style="color:#666;font-size:12px">This is an automated message from the marketplace.</p>
    </div>
  `;
}
