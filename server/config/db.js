import mongoose from "mongoose";

// Connects to MongoDB. If the connection fails the app cannot work, so exit.
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`DB connection error: ${error.message}`);
    process.exit(1);
  }
};
