import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "Admin@123456";
    const name = process.env.ADMIN_NAME || "Super Admin";

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role === "admin") {
        console.log(`Admin already exists: ${email}`);
        process.exit(0);
      }
      // Promote existing user to admin
      existing.role = "admin";
      await existing.save();
      console.log(`Existing user promoted to admin: ${email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
    });

    console.log("Admin created successfully:");
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: ${password}`);
    console.log("  (Change this password after first login!)");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();
