/**
 * Validates critical environment variables at startup and fails fast if any required variables are missing.
 */
export function validateEnv() {
  // Normalize aliases
  if (!process.env.JWT_SECRET && process.env.JWT_SECRET_KEY) {
    process.env.JWT_SECRET = process.env.JWT_SECRET_KEY;
  }
  if (!process.env.JWT_SECRET_KEY && process.env.JWT_SECRET) {
    process.env.JWT_SECRET_KEY = process.env.JWT_SECRET;
  }
  if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
    process.env.MONGODB_URI = process.env.MONGO_URI;
  }

  const missing = [];
  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    missing.push("MONGODB_URI (or MONGO_URI)");
  }
  if (!process.env.JWT_SECRET && !process.env.JWT_SECRET_KEY) {
    missing.push("JWT_SECRET_KEY (or JWT_SECRET)");
  }

  if (missing.length > 0) {
    const errorMsg = `❌ CRITICAL: Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join("\n")}`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === "production" || process.env.ENV === "prod") {
      process.exit(1);
    }
  } else {
    console.log("✅ Environment configuration validated successfully.");
  }
}

