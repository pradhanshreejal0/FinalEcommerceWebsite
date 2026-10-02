import cloudinary from "../config/cloudinary.js";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a Buffer to Cloudinary via stream (avoids base64 overhead).
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ecommerce",
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    if (!IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type. Allowed: JPEG, PNG, WebP, GIF",
      });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Image size must be less than 10 MB",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Invalid image file (no buffer)",
      });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
};
