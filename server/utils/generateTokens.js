import jwt from "jsonwebtoken";

// Short-lived token (15 min) sent with every API request.
// sessionVersion lets the server invalidate old tokens (see authMiddleware).
export const generateAccessToken = (userId, role, sessionVersion = 0) =>
  jwt.sign({ id: userId, role, sessionVersion }, process.env.JWT_SECRET, { expiresIn: "15m" });

// Long-lived token (7 days) stored in an httpOnly cookie, used only to get new access tokens.
export const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
