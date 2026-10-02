const CLOUDINARY_UPLOAD_MARKER = "/upload/";

/**
 * Build a fast Cloudinary delivery URL without changing the stored URL.
 * Cloudinary will choose WebP/AVIF where supported and resize the image
 * to the size the component actually needs.
 */
export function cloudinaryImage(url, options = {}) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(CLOUDINARY_UPLOAD_MARKER)) return url;

  const {
    width,
    height,
    quality = "auto",
    format = "auto",
    crop = "limit",
    dpr = "auto",
  } = options;

  const transformations = [`f_${format}`, `q_${quality}`, `dpr_${dpr}`];

  if (width) transformations.push(`w_${Math.round(width)}`);
  if (height) transformations.push(`h_${Math.round(height)}`);
  if (crop) transformations.push(`c_${crop}`);

  return url.replace(
    CLOUDINARY_UPLOAD_MARKER,
    `${CLOUDINARY_UPLOAD_MARKER}${transformations.join("/")}/`
  );
}
