import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

export const getAllUsers = async (req, res) => {
  try {
    const { role = "", search = "" } = req.query;
    const filter = {};

    if (role && ["customer", "vendor", "admin"].includes(role)) {
      filter.role = role;
    }

    if (search.trim()) {
      const searchText = search.trim();
      filter.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: error.message || "Failed to load users" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let vendorProfile = null;
    if (user.role === "vendor") {
      vendorProfile = await Vendor.findOne({ user: user._id });
    }

    res.json({ user, vendorProfile });
  } catch (error) {
    console.error("Get user error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    res.status(500).json({ message: error.message || "Failed to load user" });
  }
};

export const banUser = async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot ban your own account" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot ban an admin account" });
    }

    user.isBanned = true;
    await user.save();

    res.json({ message: "User banned successfully", user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error("Ban user error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    res.status(500).json({ message: error.message || "Failed to ban user" });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isBanned = false;
    await user.save();

    res.json({ message: "User unbanned successfully", user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error("Unban user error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    res.status(500).json({ message: error.message || "Failed to unban user" });
  }
};