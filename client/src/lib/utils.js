import { cn } from "cn";

// Re-export cn so other files can import it from here
export { cn };

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

// Opens a WhatsApp chat with a vendor.
export function openWhatsAppChat(phone, message) {
  if (!phone) return;

  const encodedMessage = encodeURIComponent(message || "");
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

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
    window.open(
      `https://wa.me/${phone}?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}