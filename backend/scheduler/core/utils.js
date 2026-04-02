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

// India Standard Time offset: UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Get the UTC-equivalent Date for the start of a day in IST.
 * daysOffset=0 → today IST midnight (as UTC), daysOffset=1 → tomorrow IST midnight, etc.
 * Example: IST midnight of March 31 = March 30 18:30:00 UTC
 * @param {number} daysOffset - Days relative to today IST
 * @returns {Date} - UTC Date representing IST midnight for the target day
 */
const getISTDayStartUTC = (daysOffset = 0) => {
  const nowIST = Date.now() + IST_OFFSET_MS;
  // Truncate to IST midnight (ms since epoch, IST)
  const istMidnightMs = nowIST - (nowIST % (24 * 60 * 60 * 1000));
  // Shift by daysOffset and convert back to UTC
  return new Date(
    istMidnightMs + daysOffset * 24 * 60 * 60 * 1000 - IST_OFFSET_MS,
  );
};

/**
 * Get today's date parts (month, date) in IST to avoid UTC/IST mismatch.
 * @returns {{ month: number, date: number }} - 1-based month and day-of-month in IST
 */
export const getISTTodayParts = () => {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  return {
    month: nowIST.getUTCMonth() + 1,
    date: nowIST.getUTCDate(),
  };
};

/**
 * Get the month and day of a stored date in IST, regardless of how it was persisted.
 * Handles both UTC-midnight storage (e.g. 1990-03-31T00:00Z) and
 * IST-midnight storage (e.g. 1990-03-30T18:30Z).
 * @param {Date|string} storedDate - Date from database
 * @returns {{ month: number, date: number }} - 1-based month and day-of-month in IST
 */
export const getISTDateParts = (storedDate) => {
  const dateIST = new Date(new Date(storedDate).getTime() + IST_OFFSET_MS);
  return {
    month: dateIST.getUTCMonth() + 1,
    date: dateIST.getUTCDate(),
  };
};

/**
 * Create date ranges for reminder checking (IST-aware).
 * Uses IST day boundaries so dates stored as either UTC midnight or IST midnight
 * are correctly matched — no reminders are missed due to UTC/IST offset.
 * @param {number} daysOffset - Days from today IST (positive = future, negative = past)
 * @returns {{ start: Date, end: Date }} - UTC Date range covering the full IST day
 */
export const createDateRange = (daysOffset) => {
  return {
    start: getISTDayStartUTC(daysOffset),
    end: getISTDayStartUTC(daysOffset + 1),
  };
};

/**
 * Get shop information safely
 * @param {Object} shop - Shop object
 * @returns {string} - Shop name (Hindi preferred, fallback to English)
 */
export const getShopName = (shop) => {
  if (!shop) return "Our Shop";
  const nameHi = (shop.shop_name_hi || "").trim();
  const nameEn = (shop.shop_name || "").trim();
  return nameHi || nameEn || "Our Shop";
};

/**
 * Get normalized shop contact phone number for reminders
 * @param {Object} shop - Shop object
 * @returns {string|null} - Formatted phone or null
 */
export const getShopContactInfo = (shop) => {
  if (!shop || !shop.phone) return null;
  const formatted = formatPhoneNumber(shop.phone);
  return formatted || null;
};
