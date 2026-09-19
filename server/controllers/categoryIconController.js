import cloudinary from "../config/cloudinary.js";

export const uploadCategoryIcon = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No SVG file provided",
      });
    }

    if (
      req.file.mimetype !==
      "image/svg+xml"
    ) {
      return res.status(400).json({
        message:
          "Only SVG files are allowed for category icons",
      });
    }

    const svg =
      req.file.buffer.toString("utf8");

    /*
     * Basic SVG safety checks.
     *
     * We don't allow obvious script/event-handler
     * payloads.
     */
    if (
      /<script[\s>]/i.test(svg) ||
      /\son\w+\s*=/i.test(svg) ||
      /javascript\s*:/i.test(svg)
    ) {
      return res.status(400).json({
        message:
          "Unsafe SVG content detected",
      });
    }

    const base64 =
      Buffer.from(svg).toString(
        "base64"
      );

    const dataURI =
      `data:image/svg+xml;base64,${base64}`;

    const result =
      await cloudinary.uploader.upload(
        dataURI,
        {
          folder:
            "ecommerce/category-icons",

          resource_type: "image",
        }
      );

    return res.status(201).json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(
      "Category SVG upload error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Category icon upload failed",
    });
  }
};
