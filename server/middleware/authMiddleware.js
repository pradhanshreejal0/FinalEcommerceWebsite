import jwt from "jsonwebtoken";
import User from "../models/User.js";

// protect: requires a valid "Authorization: Bearer <accessToken>" header and
// puts the logged-in user on req.user.
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found" });

    // sessionVersion changes on password reset, which kills older access tokens.
    if (Number(decoded.sessionVersion ?? 0) !== Number(req.user.sessionVersion ?? 0)) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    // A user banned mid-session is blocked right away, not after the token expires.
    if (req.user.isBanned) return res.status(403).json({ message: "Account has been banned" });

    next();
  } catch {
    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// authorize("admin", "vendor"): allows only users whose role is in the list.
// Always use it after protect.
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Access denied" });
