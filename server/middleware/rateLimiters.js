import rateLimit from "express-rate-limit";

// Shared settings: 15-minute window, standard RateLimit-* headers.
const limiter = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const loginLimiter = limiter(10, "Too many login attempts. Please try again later."); // 10 per IP
export const forgotPasswordLimiter = limiter(5, "Too many requests. Please try again later."); // 5 per IP
