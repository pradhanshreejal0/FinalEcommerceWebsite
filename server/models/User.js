import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    phone: {
      type: String,
      required: false, // not required for admin
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      default: "customer",
    },
    isBanned: { type: Boolean, default: false },
        refreshToken: { type: String },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Text index so admin can search users by name/email without a full
// collection scan on every search.
userSchema.index({ name: "text", email: "text" });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
