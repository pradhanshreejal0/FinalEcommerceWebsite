import { cn } from "cn";

export { cn };

/**
 * Calculate the actual customer-facing price.
 *
 * Uses finalPrice when the backend provides it.
 * Otherwise calculates the discount locally.
 */
export function getFinalPrice(product) {
  if (!product) {
    return 0;
  }

  const basePrice =
    Number(product.price);

  if (
    !Number.isFinite(basePrice) ||
    basePrice < 0
  ) {
    return 0;
  }

  /*
   * Prefer the backend-calculated finalPrice.
   */
  if (
    product.finalPrice !== undefined &&
    product.finalPrice !== null
  ) {
    const finalPrice =
      Number(product.finalPrice);

    if (
      Number.isFinite(finalPrice) &&
      finalPrice >= 0
    ) {
      return finalPrice;
    }
  }

  let discount =
    Number(
      product.discountPercentage || 0
    );

  if (
    !Number.isFinite(discount) ||
    discount <= 0
  ) {
    return basePrice;
  }

  /*
   * Never allow a discount above 100%.
   */
  discount = Math.min(
    Math.max(discount, 0),
    100
  );

  const finalPrice =
    basePrice -
    (basePrice * discount) /
      100;

  return (
    Math.round(
      finalPrice * 100
    ) / 100
  );
}

/**
 * Opens WhatsApp chat with a vendor.
 */
export function openWhatsAppChat(
  phone,
  message
) {
  if (!phone) {
    return;
  }

  const encodedMessage =
    encodeURIComponent(
      message || ""
    );

  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    const appUrl =
      `whatsapp://send?phone=${phone}&text=${encodedMessage}`;

    const webUrl =
      `https://wa.me/${phone}?text=${encodedMessage}`;

    const fallbackTimer =
      setTimeout(() => {
        window.open(
          webUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }, 800);

    window.addEventListener(
      "blur",
      () => {
        clearTimeout(
          fallbackTimer
        );
      },
      {
        once: true,
      }
    );

    window.location.href =
      appUrl;
  } else {
    window.open(
      `https://wa.me/${phone}?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}
