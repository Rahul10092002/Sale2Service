/**
 * Phone number normalization utilities for Indian numbers (+91 standard)
 */

/**
 * Normalizes any phone string to E.164 +91 format and 10-digit national number.
 * @param {string|number} rawPhone
 * @returns {{ formatted: string, national: string, isValid: boolean }}
 */
export function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) {
    return { formatted: null, national: null, isValid: false };
  }

  // Remove all non-digits
  const digits = String(rawPhone).replace(/\D/g, "");

  let national = "";
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else if (digits.length > 10) {
    // Take the last 10 digits if reasonable
    national = digits.slice(-10);
  } else {
    return { formatted: null, national: null, isValid: false };
  }

  // Indian mobile numbers start with 5, 6, 7, 8, or 9
  const isValid = /^[5-9]\d{9}$/.test(national);

  return {
    formatted: `+91${national}`,
    national,
    isValid,
  };
}

/**
 * Checks if two phone numbers match, accounting for various formats (+91, 0, spaces).
 * @param {string} phoneA
 * @param {string} phoneB
 * @returns {boolean}
 */
export function arePhonesEqual(phoneA, phoneB) {
  const normA = normalizeIndianPhone(phoneA);
  const normB = normalizeIndianPhone(phoneB);

  if (normA.isValid && normB.isValid) {
    return normA.national === normB.national;
  }

  // Fallback: check if trailing 10 digits match
  const digitsA = String(phoneA || "").replace(/\D/g, "").slice(-10);
  const digitsB = String(phoneB || "").replace(/\D/g, "").slice(-10);

  return digitsA.length === 10 && digitsA === digitsB;
}

