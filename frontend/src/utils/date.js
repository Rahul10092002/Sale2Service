/**
 * Standardized Date Formatter Utilities (en-IN / DD-MM-YYYY)
 */

/**
 * Formats any valid date string/timestamp into DD/MM/YYYY
 * @param {string|number|Date} dateVal
 * @param {string} fallback
 * @returns {string} e.g. "09/09/2026"
 */
export const formatDate = (dateVal, fallback = "N/A") => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
};

/**
 * Formats any valid date string/timestamp into DD/MM/YYYY, hh:mm A
 * @param {string|number|Date} dateVal
 * @param {string} fallback
 * @returns {string} e.g. "09/09/2026, 05:30 PM"
 */
export const formatDateTime = (dateVal, fallback = "N/A") => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return fallback;
  }
};

/**
 * Converts a Date to YYYY-MM-DD format for <input type="date"> values
 * @param {string|number|Date} dateVal
 * @returns {string} e.g. "2026-09-09"
 */
export const toISODate = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};
