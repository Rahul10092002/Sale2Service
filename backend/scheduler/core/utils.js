/**
 * Scheduler utility functions
 */

/**
 * Format and validate phone number for WhatsApp
 * @param {string} phoneNumber - Raw phone number
 * @param {string} defaultCountryCode - Default country code (default: "91")
 * @returns {string|null} - Formatted phone number or null if invalid
 */
export const formatPhoneNumber = (phoneNumber, defaultCountryCode = "91") => {
  if (!phoneNumber) return null;

  let cleanNumber = String(phoneNumber).replace(/[^\d]/g, "");

  // Remove leading zeros
  cleanNumber = cleanNumber.replace(/^0+/, "");

  // If number is 10 digits and doesn't start with country code, add default
  if (
    cleanNumber.length === 10 &&
    !cleanNumber.startsWith(defaultCountryCode)
  ) {
    cleanNumber = defaultCountryCode + cleanNumber;
  }

  return cleanNumber;
};

/**
 * Validate WhatsApp phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid format
 */
export const isValidWhatsAppNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  const cleanNumber = phoneNumber.replace(/[^\d]/g, "");
  return cleanNumber.length >= 10 && cleanNumber.length <= 15;
};

/**
 * Format date for display in messages (DD-MM-YYYY format)
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateForMessage = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Check if a date is within a specific range (inclusive)
 * @param {Date} targetDate - Date to check
 * @param {Date} rangeStart - Start of range
 * @param {Date} rangeEnd - End of range
 * @returns {boolean} - True if date is within range
 */
export const isDateInRange = (targetDate, rangeStart, rangeEnd) => {
  if (!targetDate || !rangeStart || !rangeEnd) return false;
  return targetDate >= rangeStart && targetDate < rangeEnd;
};

/**
 * Create date ranges for reminder checking
 * @param {number} daysOffset - Number of days from today (positive for future, negative for past)
 * @returns {object} - Object with start and end dates for the range
 */
export const createDateRange = (daysOffset) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysOffset);

  const rangeEnd = new Date(targetDate);
  rangeEnd.setDate(targetDate.getDate() + 1);

  return {
    start: targetDate,
    end: rangeEnd,
  };
};

/**
 * Get shop information safely
 * @param {Object} shop - Shop object
 * @returns {string} - Shop name (Hindi preferred, fallback to English)
 */
export const getShopName = (shop) => {
  if (!shop) return "Our Shop";
  return shop.shop_name_hi || shop.shop_name || "Our Shop";
};
