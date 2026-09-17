/**
 * Validates critical environment variables at startup and fails fast if any required variables are missing.
 */
export function validateEnv() {
  const mongoUri = (process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
  const jwtSecret = (process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "").trim();

  if (mongoUri) process.env.MONGODB_URI = mongoUri;
  if (jwtSecret) process.env.JWT_SECRET_KEY = jwtSecret;

  const missing = [];
  if (!mongoUri) missing.push("MONGODB_URI (or MONGO_URI)");
  if (!jwtSecret) missing.push("JWT_SECRET_KEY (or JWT_SECRET)");

  if (missing.length > 0) {
    console.error(`❌ CRITICAL: Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join("\n")}`);
    if (process.env.NODE_ENV === "production" || process.env.ENV === "prod") {
      process.exit(1);
    }
  } else {
    console.log("✅ Environment configuration validated successfully.");
  }
}
