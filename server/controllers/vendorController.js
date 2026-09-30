import { notifyEmail } from "../utils/notify.js";
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
      // Default store pin (Kathmandu) — admin/vendor should update later
      location: {
        latitude: 27.7172,
        longitude: 85.324,
        address: "",
        city: "Kathmandu",
        country: "Nepal",
      },
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

    const clientUrl = String(process.env.CLIENT_URL || "")
      .replace(/^["']|["']$/g, "")
      .trim() || "http://localhost:5173";

    if (vendor.user?.email) {
      notifyEmail({
        to: vendor.user.email,
        subject: `Your store "${vendor.storeName}" is approved`,
        html: `
          <div style="font-family:sans-serif;max-width:560px">
            <h2>You're approved to sell</h2>
            <p>Hi ${vendor.user.name || "there"},</p>
            <p>Your store <strong>${vendor.storeName}</strong> has been approved.</p>
            <p>You can now add products and start selling.</p>
            <p><a href="${clientUrl}/vendor">Open vendor dashboard</a></p>
            <p style="color:#666;font-size:12px">Automated marketplace notification.</p>
          </div>
        `,
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

    if (vendor.user?.email) {
      notifyEmail({
        to: vendor.user.email,
        subject: `Vendor application update: ${vendor.storeName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px">
            <h2>Application not approved</h2>
            <p>Hi ${vendor.user.name || "there"},</p>
            <p>Your application for <strong>${vendor.storeName}</strong> was not approved at this time.</p>
            <p>You can update your store profile or contact support if you have questions.</p>
            <p style="color:#666;font-size:12px">Automated marketplace notification.</p>
          </div>
        `,
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
      location,
      latitude,
      longitude,
      address,
      city,
      country,
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

    // Store location — accept nested `location` object or flat lat/lng fields
    const locSource =
      location && typeof location === "object" ? location : null;
    const latRaw =
      locSource?.latitude ?? latitude;
    const lngRaw =
      locSource?.longitude ?? longitude;

    if (latRaw !== undefined && lngRaw !== undefined) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);

      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ message: "Invalid latitude" });
      }
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Invalid longitude" });
      }

      vendor.location = {
        latitude: lat,
        longitude: lng,
        address:
          locSource?.address !== undefined
            ? String(locSource.address).trim()
            : address !== undefined
            ? String(address).trim()
            : vendor.location?.address || "",
        city:
          locSource?.city !== undefined
            ? String(locSource.city).trim()
            : city !== undefined
            ? String(city).trim()
            : vendor.location?.city || "",
        country:
          locSource?.country !== undefined
            ? String(locSource.country).trim()
            : country !== undefined
            ? String(country).trim()
            : vendor.location?.country || "Nepal",
      };
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

// Admin: update vendor location
export const updateVendorLocation = async (req, res) => {
  try {
    const { latitude, longitude, address, city, country } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ message: "Invalid latitude" });
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Invalid longitude" });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.location = {
      latitude: lat,
      longitude: lng,
      address: address !== undefined ? String(address).trim() : vendor.location?.address || "",
      city: city !== undefined ? String(city).trim() : vendor.location?.city || "",
      country: country !== undefined ? String(country).trim() : vendor.location?.country || "Nepal",
    };

    await vendor.save();

    const populated = await Vendor.findById(vendor._id).populate(
      "user",
      "name email phone createdAt"
    );

    res.json(populated);
  } catch (error) {
    console.error("Update vendor location error:", error);
    res.status(500).json({
      message: error.message || "Failed to update vendor location",
    });
  }
};

// Public store page by slug
export const getPublicStore = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      return res.status(400).json({ message: "Store slug required" });
    }

    const vendor = await Vendor.findOne({
      storeSlug: slug,
      status: "approved",
    }).select(
      "storeName storeSlug storeDescription logo banner location phone createdAt"
    );

    if (!vendor) {
      return res.status(404).json({ message: "Store not found" });
    }

    const Product = (await import("../models/Product.js")).default;
    const products = await Product.find({
      vendor: vendor._id,
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .limit(48)
      .select("title price images discountPercentage ratings stock");

    res.json({ vendor, products });
  } catch (error) {
    console.error("Public store error:", error);
    res.status(500).json({ message: error.message || "Failed to load store" });
  }
};
