import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

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
import statsRoutes from "./routes/statsRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import categoryIconRoutes from "./routes/categoryIconRoutes.js";

dotenv.config();

const app = express();

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://final-ecommerce-website-three.vercel.app",
  process.env.CLIENT_URL,
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

app.use(
  express.json({
    limit: "2mb",
  })
);

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

    res.status(
      err.status || 500
    ).json({
      message:
        err.message ||
        "Something went wrong",
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
