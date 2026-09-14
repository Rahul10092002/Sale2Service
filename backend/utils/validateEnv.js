/**
 * Validates critical environment variables at startup and fails fast if any required variables are missing.
 */
export function validateEnv() {
  const required = [
    "MONGODB_URI",
    "JWT_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key] || process.env[key].trim() === "");

  if (missing.length > 0) {
    const errorMsg = `❌ CRITICAL: Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join("\n")}`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Warnings for recommended production variables
  const recommended = [
    "PORT",
    "MSG91_AUTH_KEY",
    "CLOUDINARY_CLOUD_NAME",
  ];

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0 && process.env.NODE_ENV === "production") {
    console.warn(`⚠️ Recommended environment variables not set:\n${missingRecommended.map((k) => `   - ${k}`).join("\n")}`);
  }
}
