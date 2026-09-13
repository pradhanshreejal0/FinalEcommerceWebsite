// Works whether the backend sent the `finalPrice` virtual or not.
export function getFinalPrice(product) {
  if (!product) return 0;
  if (product.finalPrice !== undefined && product.finalPrice !== null) {
    return Number(product.finalPrice);
  }
  const discount = Number(product.discountPercentage) || 0;
  if (discount > 0) {
    return Math.round((product.price - (product.price * discount) / 100) * 100) / 100;
  }
  return Number(product.price) || 0;
}

// Opens a WhatsApp chat with a vendor. Tries the native app first (works
// great in mobile browsers / when the site is opened as an installed PWA),
// and falls back to the wa.me web/App-Store redirect if the app doesn't
// respond quickly — e.g. on desktop, or a phone without WhatsApp installed.
export function openWhatsAppChat(phone, message) {
  if (!phone) return;

  const encodedMessage = encodeURIComponent(message || "");
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    // If the whatsapp:// scheme has no handler, the browser silently does
    // nothing and the page stays focused — so if we're still here after a
    // short delay, fall back to the web link (opens the app via wa.me's own
    // redirect, or the App/Play Store listing if WhatsApp isn't installed).
    const fallbackTimer = setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, 800);

    window.addEventListener(
      "blur",
      () => clearTimeout(fallbackTimer),
      { once: true }
    );

    window.location.href = appUrl;
  } else {
    // Desktop: wa.me opens WhatsApp Web directly, or the desktop app if
    // the browser has it registered as the handler for the link.
    window.open(
      `https://wa.me/${phone}?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}