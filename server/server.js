// =====================================================
// E-commerce API entry point (Express + MongoDB)
// =====================================================
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import zlib from "node:zlib";

import { loginLimiter, forgotPasswordLimiter } from "./middleware/rateLimiters.js";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import categoryIconRoutes from "./routes/categoryIconRoutes.js";
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

dotenv.config();

const app = express();

// Behind a proxy (Vercel/Render) so rate limiting sees the visitor's real IP,
// not the proxy's.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Compress JSON API responses when the browser supports gzip. This avoids
// adding another dependency and keeps larger product/category payloads small.
app.use((req, res, next) => {
  if (req.method === "HEAD" || req.method === "OPTIONS") return next();

  const acceptEncoding = String(req.headers["accept-encoding"] || "");
  if (!acceptEncoding.includes("gzip")) return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      const json = JSON.stringify(body);

      // Tiny responses are faster without compression overhead.
      if (json.length < 1024 || res.headersSent) {
        return originalJson(body);
      }

      const compressed = zlib.gzipSync(Buffer.from(json));
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.removeHeader("Content-Length");
      return res.end(compressed);
    } catch (error) {
      return originalJson(body);
    }
  };

  next();
});

// Basic security headers (no extra dependency needed).
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

// ---------- Database ----------
connectDB()
  .then(() => (app.locals.dbReady = true))
  .catch(() => (app.locals.dbReady = false));

// Readiness probe: 200 once MongoDB is connected, 503 before that.
app.get("/health", (req, res) => {
  const ready = req.app.locals.dbReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "starting",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ---------- CORS ----------
// Browsers may call the API only from these frontends (plus Vercel previews).
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://final-ecommerce-website-three.vercel.app",
  "https://finalecommercewebsite.vercel.app",
  process.env.CLIENT_URL?.replace(/^["']|["']$/g, ""),
].filter(Boolean);
const vercelPreview = /^https:\/\/final-ecommerce-website-[a-z0-9-]+\.vercel\.app$/i;

app.use(
  cors({
    // No Origin header = server-to-server / curl, which is allowed.
    origin: (origin, cb) =>
      cb(null, !origin || allowedOrigins.includes(origin) || vercelPreview.test(origin)),
    credentials: true, // needed for the httpOnly refresh-token cookie
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"], // so the report download keeps its filename
  })
);

// ---------- Body / cookie parsing ----------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());

// Brute-force protection on the sensitive auth endpoints.
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);

// ---------- Routes ----------
const routes = {
  auth: authRoutes,
  categories: categoryRoutes,
  "category-icons": categoryIconRoutes,
  vendors: vendorRoutes,
  ads: adRoutes,
  upload: uploadRoutes,
  products: productRoutes,
  cart: cartRoutes,
  orders: orderRoutes,
  payments: paymentRoutes,
  coupons: couponRoutes,
  returns: returnRoutes,
  payouts: payoutRoutes,
  stats: statsRoutes,
  wishlist: wishlistRoutes,
  reviews: reviewRoutes,
  users: userRoutes,
  settings: settingsRoutes,
  chats: chatRoutes,
};
for (const [path, router] of Object.entries(routes)) app.use(`/api/${path}`, router);

app.get("/", (req, res) => res.json({ success: true, message: "E-commerce API is running" }));

// ---------- Global error handler ----------
// Hides internal error details from clients in production.
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  const status = Number(err.status || err.statusCode) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  res.status(safeStatus).json({
    message:
      safeStatus >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Something went wrong",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
