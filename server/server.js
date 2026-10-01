import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";

import {
  loginLimiter,
  forgotPasswordLimiter,
} from "./middleware/rateLimiters.js";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import categoryIconRoutes from "./routes/categoryIconRoutes.js";

dotenv.config();

const app = express();

// Required when running behind a reverse proxy (Vercel, Render, etc.).
// Without this, express-rate-limit sees the proxy's IP for every request
// instead of the real visitor's IP — so the login/forgot-password limits
// either apply to everyone at once or don't work at all.
app.set("trust proxy", 1);

// Basic security headers without adding another runtime dependency.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// =====================================================
// DATABASE
// =====================================================

connectDB().then(() => {
  app.locals.dbReady = true;
}).catch(() => {
  app.locals.dbReady = false;
});

// =====================================================
// HEALTH / READINESS
// =====================================================

app.get("/health", (req, res) => {
  const state = req.app.locals.dbReady ? "ok" : "starting";
  res.status(state === "ok" ? 200 : 503).json({
    status: state,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://final-ecommerce-website-three.vercel.app",
  "https://finalecommercewebsite.vercel.app",
  process.env.CLIENT_URL?.replace(/^["']|["']$/g, ""),
].filter(Boolean);

/*
 * Allows Vercel preview deployments such as:
 *
 * https://final-ecommerce-website-xxxxx.vercel.app
 *
 * and your previous:
 *
 * https://final-ecommerce-website-xxxxx-myself-85a7.vercel.app
 */
const vercelPreviewPattern =
  /^https:\/\/final-ecommerce-website-[a-z0-9-]+\.vercel\.app$/i;

app.use((req, res, next) => {
  const origin =
    req.headers.origin;

  const isAllowed =
    !origin ||
    allowedOrigins.includes(
      origin
    ) ||
    vercelPreviewPattern.test(
      origin
    );

  /*
   * Only return Access-Control-Allow-Origin
   * for an allowed origin.
   */
  if (
    origin &&
    isAllowed
  ) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  /*
   * Important when returning different
   * origins dynamically.
   */
  res.setHeader(
    "Vary",
    "Origin"
  );

  res.setHeader(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  /*
   * Handle browser preflight requests.
   */
  if (
    req.method === "OPTIONS"
  ) {
    if (
      origin &&
      !isAllowed
    ) {
      return res.status(403).json({
        message:
          "CORS origin not allowed",
      });
    }

    return res.sendStatus(
      204
    );
  }

  next();
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(cookieParser());

app.use(
  "/api/auth/login",
  loginLimiter
);

app.use(
  "/api/auth/forgot-password",
  forgotPasswordLimiter
);

// =====================================================
// ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/category-icons",
  categoryIconRoutes
);

app.use(
  "/api/vendors",
  vendorRoutes
);

app.use(
  "/api/ads",
  adRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/cart",
  cartRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/coupons",
  couponRoutes
);

app.use(
  "/api/returns",
  returnRoutes
);

app.use(
  "/api/payouts",
  payoutRoutes
);

app.use(
  "/api/stats",
  statsRoutes
);

app.use(
  "/api/wishlist",
  wishlistRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/settings",
  settingsRoutes
);

app.use(
  "/api/chats",
  chatRoutes
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,
      message:
        "E-commerce API is running",
    });
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "Server Error:",
      err
    );

    const status = Number(err.status || err.statusCode) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    res.status(safeStatus).json({
      message: safeStatus >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Something went wrong",
    });
  }
);

// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
