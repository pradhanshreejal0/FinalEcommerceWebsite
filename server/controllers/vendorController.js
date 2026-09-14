import Vendor from "../models/Vendor.js";
import User from "../models/User.js";

// Admin: create a vendor account (user + vendor profile, already approved)
export const createVendor = async (req, res) => {
  try {
    const { name, email, password, storeName, phone } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }
    if (!storeName || !String(storeName).trim()) {
      return res.status(400).json({ message: "Store name is required" });
    }

    // Phone required for vendors
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const digitsOnly = String(phone).replace(/[^\d]/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({
        message: "Phone number must be 7–15 digits (include country code)",
      });
    }

    const existing = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create user with vendor role + phone
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: String(password),
      phone: digitsOnly,
      role: "vendor",
    });

    const slugBase = String(storeName)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const vendor = await Vendor.create({
      user: user._id,
      storeName: String(storeName).trim(),
      storeSlug: `${slugBase}-${user._id.toString().slice(-4)}`,
      phone: digitsOnly,
      status: "approved",
    });

    const populated = await Vendor.findById(vendor._id).populate(
      "user",
      "name email phone createdAt"
    );

    res.status(201).json(populated);
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({
      message: error.message || "Failed to create vendor",
    });
  }
};

// Admin: get pending vendors
export const getPendingVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "pending" }).populate(
      "user",
      "name email phone createdAt"
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
      "name email phone createdAt"
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
    ).populate("user", "name email phone");

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
    ).populate("user", "name email phone");

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
    }).populate("user", "name email phone");

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

    if (storeName !== undefined) {
      const trimmedStoreName = String(storeName).trim();
      if (!trimmedStoreName) {
        return res.status(400).json({
          message: "Store name is required",
        });
      }
      vendor.storeName = trimmedStoreName;
    }

    if (storeDescription !== undefined) {
      vendor.storeDescription = String(storeDescription).trim();
    } else if (description !== undefined) {
      vendor.storeDescription = String(description).trim();
    }

    if (logo !== undefined) {
      vendor.logo = String(logo).trim();
    }

    if (banner !== undefined) {
      vendor.banner = String(banner).trim();
    }

    // Phone (vendor contact number)
    if (phone !== undefined) {
      const digitsOnly = String(phone).replace(/[^\d]/g, "");
      if (digitsOnly && (digitsOnly.length < 7 || digitsOnly.length > 15)) {
        return res.status(400).json({
          message:
            "Phone number must include the country code and be a valid length (7-15 digits).",
        });
      }
      vendor.phone = digitsOnly;

      // Keep user.phone in sync
      await User.findByIdAndUpdate(req.user._id, { phone: digitsOnly });
    }

    await vendor.save();

    const populatedVendor = await Vendor.findById(vendor._id).populate(
      "user",
      "name email phone"
    );

    res.json(populatedVendor);
  } catch (error) {
    console.error("Update vendor profile error:", error);
    res.status(500).json({
      message: error.message || "Failed to update vendor profile",
    });
  }
};