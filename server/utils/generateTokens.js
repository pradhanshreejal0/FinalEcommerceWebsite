import jwt from "jsonwebtoken";

export const generateAccessToken = (userId, role, sessionVersion = 0) => {
  return jwt.sign(
    { id: userId, role, sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};