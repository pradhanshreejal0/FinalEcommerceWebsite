// =====================================================
// Auth: register, login, refresh, logout, profile, password reset
// Access token  = short-lived JWT (15 min) sent in the Authorization header.
// Refresh token = long-lived JWT (7 days) in an httpOnly cookie; only its
//                 SHA-256 hash is stored in the DB, and it rotates on each use.
// =====================================================
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import { notifyEmail } from "../utils/notify.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

// Escape user-provided text before putting it in an HTML email.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Frontend URL (used in email links and to decide the cookie mode below).
const clientUrl = String(process.env.CLIENT_URL || "").replace(/^["']|["']$/g, "").trim();

// Frontend on Vercel + backend on Render = cross-site, so the cookie needs
// SameSite=None + Secure. On localhost we use Lax so it works over plain HTTP.
const isCrossSite = clientUrl.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(clientUrl);
const clearCookieOptions = {
  httpOnly: true,
  secure: isCrossSite,
  sameSite: isCrossSite ? "none" : "lax",
  path: "/",
};
const cookieOptions = { ...clearCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 };

// Phone must be 7–15 digits; returns the digits or null when invalid.
const cleanPhone = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
};
const PHONE_ERROR = "Phone number must be 7–15 digits (include country code)";

// The user fields the frontend is allowed to see.
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone || "", role: u.role });

// Creates a fresh token pair, stores the refresh-token hash and sets the cookie.
async function startSession(res, user) {
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = sha256(refreshToken);
  await user.save();
  res.cookie("refreshToken", refreshToken, cookieOptions);
  return generateAccessToken(user._id, user.role, user.sessionVersion);
}

// ---------- Register ----------
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, storeName } = req.body;

    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (typeof email !== "string" || !email.trim()) return res.status(400).json({ message: "Invalid email" });
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!phone || !String(phone).trim()) return res.status(400).json({ message: "Phone number is required" });

    const digits = cleanPhone(phone);
    if (!digits) return res.status(400).json({ message: PHONE_ERROR });

    // Only "vendor" can be self-selected; admin can never be requested here.
    const isVendor = role === "vendor";
    if (isVendor && !String(storeName || "").trim()) {
      return res.status(400).json({ message: "Store name is required for vendor registration" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password, // hashed by the model's pre-save hook
      phone: digits,
      role: isVendor ? "vendor" : "customer",
    });

    if (isVendor) {
      const slugBase = String(storeName).toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      const vendor = await Vendor.create({
        user: user._id,
        storeName: String(storeName).trim(),
        storeSlug: `${slugBase}-${user._id.toString().slice(-4)}`,
        phone: digits,
        status: "pending", // an admin must approve before selling
        location: { latitude: 27.7172, longitude: 85.324, address: "", city: "Kathmandu", country: "Nepal" },
      });

      // Email every admin about the new application (never blocks registration).
      const admins = await User.find({ role: "admin" }).select("email");
      const recipients = new Set([process.env.ADMIN_EMAIL, ...admins.map((a) => a.email)].filter(Boolean));
      for (const to of recipients) {
        notifyEmail({
          to,
          subject: `New vendor application: ${vendor.storeName}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px">
              <h2>New vendor registration</h2>
              <p><strong>${esc(user.name)}</strong> applied to sell as <strong>${esc(vendor.storeName)}</strong>.</p>
              <ul>
                <li>Email: ${esc(user.email)}</li>
                <li>Phone: ${esc(user.phone) || "—"}</li>
                <li>Store slug: ${esc(vendor.storeSlug)}</li>
              </ul>
              <p><a href="${clientUrl || "http://localhost:5173"}/admin/vendors">Review in admin panel</a></p>
              <p style="color:#666;font-size:12px">Automated marketplace notification.</p>
            </div>`,
        });
      }
    }

    const accessToken = await startSession(res, user);
    res.status(201).json({ user: publicUser(user), accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Login ----------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Same message for "no such user" and "wrong password" (no account probing).
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.isBanned) return res.status(403).json({ message: "Account has been banned" });

    const accessToken = await startSession(res, user);
    res.json({ user: publicUser(user), accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Refresh: swap the cookie token for a new access token ----------
export const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken"); // select:false in schema

    // Must match the stored hash, otherwise it was already rotated or revoked.
    if (!user || user.refreshToken !== sha256(token)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    if (user.isBanned) return res.status(403).json({ message: "Account has been banned" });

    const accessToken = await startSession(res, user); // rotates the refresh token
    res.json({ user: publicUser(user), accessToken });
  } catch {
    res.status(401).json({ message: "Refresh token expired or invalid" });
  }
};

// ---------- Logout: revoke the stored refresh token and clear the cookie ----------
export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch {
        // invalid/expired token: nothing to revoke
      }
    }
    res.clearCookie("refreshToken", clearCookieOptions);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Current user ----------
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, phone } = req.body;
    if (name !== undefined) user.name = String(name).trim();

    if (phone !== undefined) {
      if (!String(phone).trim()) {
        // Only admins may have no phone number.
        if (user.role !== "admin") return res.status(400).json({ message: "Phone number is required" });
        user.phone = "";
      } else {
        const digits = cleanPhone(phone);
        if (!digits) return res.status(400).json({ message: PHONE_ERROR });
        user.phone = digits;
      }
    }

    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone || "", role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Delete own account (password required) ----------
export const deleteMe = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts can't be self-deleted. Ask another admin to remove your account.",
      });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Please enter your password to confirm account deletion" });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // A vendor must remove their products first, then the store is deleted too.
    if (user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: user._id });
      if (vendor) {
        if ((await Product.countDocuments({ vendor: vendor._id })) > 0) {
          return res.status(400).json({
            message:
              "You still have products listed. Remove them (or ask an admin to reassign them) before deleting your account.",
          });
        }
        await Vendor.deleteOne({ _id: vendor._id });
      }
    }

    await Promise.all([Cart.deleteOne({ user: user._id }), Wishlist.deleteOne({ user: user._id })]);
    await User.deleteOne({ _id: user._id });

    res.clearCookie("refreshToken", clearCookieOptions);
    res.json({ message: "Your account has been deleted." });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: error.message || "Failed to delete account" });
  }
};

// ---------- Forgot password: email a one-time reset link ----------
const RESET_REPLY = { message: "If that email is registered, a reset link has been sent." };

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string") return res.status(400).json({ message: "Invalid email" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.json(RESET_REPLY); // identical reply: don't reveal which emails exist

    // The raw token goes in the email; only its hash is stored.
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = sha256(rawToken);
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;
    // notifyEmail never throws, so an SMTP outage can't turn this into a 500
    // (which would also reveal that the email exists).
    await notifyEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Hi ${esc(user.name)},</p>
        <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can ignore this email.</p>`,
    });

    res.json(RESET_REPLY);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Reset password using the emailed token ----------
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: sha256(req.params.token),
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Reset link is invalid or has expired" });

    user.password = password; // hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // log out every old session...
    user.sessionVersion = (user.sessionVersion || 0) + 1; // ...including access tokens that are still valid
    await user.save();

    res.json({ message: "Password reset successful. Please log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
