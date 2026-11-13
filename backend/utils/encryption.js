import crypto from "crypto";

/**
 * Derives a 32-byte key from environment secret using SHA-256
 */
const getEncryptionKey = () => {
  const secret =
    process.env.GOOGLE_ENCRYPTION_KEY ||
    process.env.JWT_SECRET_KEY ||
    process.env.JWT_SECRET ||
    "warranty-desk-default-encryption-key-32-bytes";
  return crypto.createHash("sha256").update(String(secret)).digest();
};

/**
 * Encrypts a string using AES-256-GCM authenticated encryption.
 * @param {string} text - Plain text to encrypt
 * @returns {{ ciphertext: string, iv: string, tag: string } | null}
 */
export function encryptToken(text) {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(String(text), "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    };
  } catch (error) {
    console.error("Token encryption failed:", error);
    throw new Error("Token encryption failed");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * @param {{ ciphertext: string, iv: string, tag: string }} payload
 * @returns {string | null}
 */
export function decryptToken({ ciphertext, iv, tag }) {
  if (!ciphertext || !iv || !tag) return null;
  try {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
}

