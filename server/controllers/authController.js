import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { notifyEmail } from "../utils/notify.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";

// Cross-site (Vercel frontend → Render backend) needs SameSite=None + Secure.
// Local (localhost → localhost) uses Lax so cookies work on HTTP.
const clientUrl = String(process.env.CLIENT_URL || "")
  .replace(/^["']|["']$/g, "")
  .trim();

const isCrossSite =
  clientUrl.startsWith("https://") &&
  !/localhost|127\.0\.0\.1/.test(clientUrl);

const cookieOptions = {
  httpOnly: true,
  secure: isCrossSite,
  sameSite: isCrossSite ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isCrossSite,
  sameSite: isCrossSite ? "none" : "lax",
  path: "/",
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, storeName } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const digitsOnly = String(phone).replace(/[^\d]/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({
        message: "Phone number must be 7–15 digits (include country code)",
      });
    }

    const requestedRole = role === "vendor" ? "vendor" : "customer";

    if (requestedRole === "vendor") {
      if (!storeName || !String(storeName).trim()) {
        return res.status(400).json({
          message: "Store name is required for vendor registration",
        });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: digitsOnly,
      role: requestedRole,
    });

    let vendorDoc = null;
    if (requestedRole === "vendor") {
      const slugBase = String(storeName)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      vendorDoc = await Vendor.create({
        user: user._id,
        storeName: String(storeName).trim(),
        storeSlug: `${slugBase}-${user._id.toString().slice(-4)}`,
        phone: digitsOnly,
        status: "pending",
        location: {
          latitude: 27.7172,
          longitude: 85.324,
          address: "",
          city: "Kathmandu",
          country: "Nepal",
        },
      });

      // Notify all admins (and ADMIN_EMAIL env) about new vendor application
      const admins = await User.find({ role: "admin" }).select("email");
      const adminEmails = [
        ...new Set(
          [
            process.env.ADMIN_EMAIL,
            ...admins.map((a) => a.email),
          ].filter(Boolean)
        ),
      ];
      const clientUrl = String(process.env.CLIENT_URL || "")
        .replace(/^["']|["']$/g, "")
        .trim() || "http://localhost:5173";

      for (const to of adminEmails) {
        notifyEmail({
          to,
          subject: `New vendor application: ${vendorDoc.storeName}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px">
              <h2>New vendor registration</h2>
              <p><strong>${user.name}</strong> applied to sell as <strong>${vendorDoc.storeName}</strong>.</p>
              <ul>
                <li>Email: ${user.email}</li>
                <li>Phone: ${user.phone || "—"}</li>
                <li>Store slug: ${vendorDoc.storeSlug}</li>
              </ul>
              <p><a href="${clientUrl}/admin/vendors">Review in admin panel</a></p>
              <p style="color:#666;font-size:12px">Automated marketplace notification.</p>
            </div>
          `,
        });
      }
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been banned" });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been banned" });
    }

    const accessToken = generateAccessToken(user._id, user.role);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Refresh token expired or invalid" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch {
        // ignore invalid token on logout
      }
    }

    res.clearCookie("refreshToken", clearCookieOptions);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, phone } = req.body;

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    if (phone !== undefined) {
      if (!String(phone).trim()) {
        if (user.role === "admin") {
          user.phone = "";
        } else {
          return res.status(400).json({ message: "Phone number is required" });
        }
      } else {
        const digitsOnly = String(phone).replace(/[^\d]/g, "");
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          return res.status(400).json({
            message:
              "Phone number must be 7–15 digits (include country code)",
          });
        }
        user.phone = digitsOnly;
      }
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMe = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message:
          "Admin accounts can't be self-deleted. Ask another admin to remove your account.",
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "Please enter your password to confirm account deletion",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    if (user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: user._id });
      if (vendor) {
        const activeProducts = await Product.countDocuments({
          vendor: vendor._id,
        });
        if (activeProducts > 0) {
          return res.status(400).json({
            message:
              "You still have products listed. Remove them (or ask an admin to reassign them) before deleting your account.",
          });
        }
        await Vendor.deleteOne({ _id: vendor._id });
      }
    }

    await Promise.all([
      Cart.deleteOne({ user: user._id }),
      Wishlist.deleteOne({ user: user._id }),
    ]);

    await User.deleteOne({ _id: user._id });

    res.clearCookie("refreshToken", clearCookieOptions);

    res.json({ message: "Your account has been deleted." });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      message: error.message || "Failed to delete account",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string") {
      return res.status(400).json({ message: "Invalid email" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always same response (don't leak whether email exists)
    if (!user) {
      return res.json({
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const baseUrl = clientUrl || process.env.CLIENT_URL || "";
    const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });

    res.json({
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    user.password = password; // pre("save") hook hashes it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // log out old sessions
    await user.save();

    res.json({ message: "Password reset successful. Please log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
