import Vendor from "../models/Vendor.js";

// Admin: get pending vendors
export const getPendingVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "pending" }).populate(
      "user",
      "name email createdAt"
    );

    res.json(vendors);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to get pending vendors",
    });
  }
};

// Admin: get all vendors
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().populate(
      "user",
      "name email createdAt"
    );

    res.json(vendors);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to get vendors",
    });
  }
};

// Admin: approve vendor
export const approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      {
        new: true,
        runValidators: true,
      }
    ).populate("user", "name email");

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to approve vendor",
    });
  }
};

// Admin: reject vendor
export const rejectVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      {
        new: true,
        runValidators: true,
      }
    ).populate("user", "name email");

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to reject vendor",
    });
  }
};

// Vendor: get own profile
export const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      user: req.user._id,
    }).populate("user", "name email");

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor profile not found",
      });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to load vendor profile",
    });
  }
};

// Vendor: update own profile
export const updateMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      user: req.user._id,
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor profile not found",
      });
    }

    const {
      storeName,
      storeDescription,
      description,
      logo,
      banner,
      phone,
    } = req.body;

    // Store name
    if (storeName !== undefined) {
      const trimmedStoreName = String(storeName).trim();

      if (!trimmedStoreName) {
        return res.status(400).json({
          message: "Store name is required",
        });
      }

      vendor.storeName = trimmedStoreName;
    }

    // Store description
    //
    // New/correct field:
    // storeDescription
    //
    // We also support "description" so existing frontend code
    // doesn't immediately break.
    if (storeDescription !== undefined) {
      vendor.storeDescription = String(storeDescription).trim();
    } else if (description !== undefined) {
      vendor.storeDescription = String(description).trim();
    }

    // Logo
    if (logo !== undefined) {
      vendor.logo = String(logo).trim();
    }

    // Banner
    if (banner !== undefined) {
      vendor.banner = String(banner).trim();
    }

    // WhatsApp phone number
    // Accept digits, spaces, "+", and "-" from the input, then strip
    // everything down to digits only for storage (matches what wa.me expects).
    if (phone !== undefined) {
      const digitsOnly = String(phone).replace(/[^\d]/g, "");

      if (digitsOnly && (digitsOnly.length < 7 || digitsOnly.length > 15)) {
        return res.status(400).json({
          message:
            "Phone number must include the country code and be a valid length (7-15 digits).",
        });
      }

      vendor.phone = digitsOnly;
    }

    await vendor.save();

    const populatedVendor = await Vendor.findById(vendor._id).populate(
      "user",
      "name email"
    );

    res.json(populatedVendor);
  } catch (error) {
    console.error("Update vendor profile error:", error);

    res.status(500).json({
      message: error.message || "Failed to update vendor profile",
    });
  }
};
