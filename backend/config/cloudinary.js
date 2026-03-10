import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

/**
 * Cloudinary Configuration
 * Initializes Cloudinary with environment variables
 */
const configureCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true, // Always use HTTPS
    });

    console.log("✅ Cloudinary configured successfully");
    return cloudinary;
  } catch (error) {
    console.error("❌ Cloudinary configuration failed:", error.message);
    throw new Error("Failed to configure Cloudinary");
  }
};

/**
 * Validate Cloudinary configuration
 */
const validateCloudinaryConfig = () => {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing Cloudinary environment variables: ${missingVars.join(", ")}`,
    );
  }
};

// Initialize and export configured cloudinary instance
validateCloudinaryConfig();
const cloudinaryInstance = configureCloudinary();

export default cloudinaryInstance;
