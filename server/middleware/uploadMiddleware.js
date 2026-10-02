import multer from "multer";

// Files are kept in memory (not on disk) and then sent on to Cloudinary.
// Only raster images up to 5 MB; SVG is blocked because it can contain scripts.
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml"
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"), false),
  limits: { fileSize: 5 * 1024 * 1024 },
});
