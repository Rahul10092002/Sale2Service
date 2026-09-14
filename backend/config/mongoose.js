import mongoose from "mongoose";

export const MongoDb = async () => {
  try {
    const maxPoolSize = parseInt(process.env.MONGODB_MAX_POOL_SIZE || "25", 10);
    const minPoolSize = parseInt(process.env.MONGODB_MIN_POOL_SIZE || "5", 10);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB connection lost. Reconnecting...");
    });

    console.log(`✅ Connected with Database: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
