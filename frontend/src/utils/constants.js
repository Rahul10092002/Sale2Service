/**
 * Application-wide constants
 */

// User roles
export const USER_ROLES = {
  OWNER: "OWNER",
  STAFF: "STAFF",
};

// Route paths
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  SHOPS: "/shops",
  CUSTOMERS: "/customers",
  PRODUCTS: "/products",
  INVENTORY: "/inventory",
  USERS: "/users",
  INVOICES: "/invoices",
  SALES: "/sales",
  WARRANTY: "/warranty",
  DEALERS: "/dealers",
  PURCHASE_INTAKE: "/purchases/new",
  PURCHASES: "/purchases",
  SERVICES: "/services",
  LOGS: "/logs",
  FESTIVAL_SCHEDULE: "/festival-schedule",
  SETTINGS: "/settings",
  PRIVACY_POLICY: "/privacy-policy",
  NEW_INVOICE: "/invoices/new",
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    REFRESH: "/auth/refresh",
  },
  SHOPS: {
    LIST: "/shops",
    CREATE: "/shops",
    UPDATE: (id) => `/shops/${id}`,
    DELETE: (id) => `/shops/${id}`,
  },
  USERS: {
    LIST: "/users",
    CREATE: "/users",
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },
  DEALERS: {
    LIST: "/dealers",
    ALL_HISTORY: "/dealers/all-history",
    CREATE: "/dealers",
    UPDATE: (id) => `/dealers/${id}`,
    DELETE: (id) => `/dealers/${id}`,
  },
  INVENTORY: {
    LIST: "/inventory/items",
    RECEIVING_SLIP: "/inventory/receiving-slip",
    LINK_DEALER: (itemId) => `/inventory/items/${itemId}/link-dealer`,
    UPDATE_STATUS: (itemId) => `/inventory/items/${itemId}/status`,
    LOGS: (itemId) => `/inventory/items/${itemId}/logs`,
  },
  WARRANTY: {
    LOOKUP: (query) => `/warranty/lookup?query=${encodeURIComponent(query)}`,
  },
  INVOICES: {
    LIST: "/invoices",
    CREATE: "/invoices",
    UPDATE: (id) => `/invoices/${id}`,
    DELETE: (id) => `/invoices/${id}`,
    GET_NEXT_NUMBER: "/invoices/next-number",
    CHECK_SERIAL: "/invoices/check-serial",
    SEARCH_CUSTOMER: "/invoices/search-customer",
  },
  PRODUCTS: {
    LIST: "/products",
    CREATE: "/products",
    DELETE: (id) => `/products/${id}`,
  },
  CUSTOMERS: {
    LIST: "/customers",
    CREATE: "/customers",
    UPDATE: (id) => `/customers/${id}`,
    DELETE: (id) => `/customers/${id}`,
  },
};

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: "This field is required",
  EMAIL_INVALID: "Please enter a valid email address",
  PASSWORD_MIN_LENGTH: "Password must be at least 8 characters long",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  MOBILE_INVALID: "Please enter a valid mobile number",
  SHOP_NAME_MIN_LENGTH: "Shop name must be at least 3 characters long",
  OWNER_NAME_MIN_LENGTH: "Owner name must be at least 2 characters long",
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: "sales_portal_token",
  USER_PREFERENCES: "sales_portal_user_preferences",
  THEME: "sales_portal_theme",
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNAUTHORIZED: "You are not authorized to access this resource.",
  FORBIDDEN: "Access forbidden.",
  NOT_FOUND: "Resource not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNKNOWN_ERROR: "An unexpected error occurred.",
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Successfully logged in!",
  SIGNUP_SUCCESS: "Account created successfully!",
  LOGOUT_SUCCESS: "Successfully logged out!",
  UPDATE_SUCCESS: "Successfully updated!",
  DELETE_SUCCESS: "Successfully deleted!",
  CREATE_SUCCESS: "Successfully created!",
};

// Theme constants
export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Invoice constants
export const INVOICE_CONSTANTS = {
  ITEM_TYPES: {
    PRODUCT: "PRODUCT",
    SERVICE: "SERVICE",
  },
  SERVICE_CATEGORIES: {
    REPAIR: "REPAIR",
    MAINTENANCE: "MAINTENANCE",
    INSTALLATION: "INSTALLATION",
    ACID_REFILL: "ACID_REFILL",
    LABOR: "LABOR",
    WIRING: "WIRING",
    OTHER: "OTHER",
  },
  SERVICE_CATEGORY_LABELS: {
    REPAIR: "Repair Service",
    MAINTENANCE: "Maintenance & Checkup",
    INSTALLATION: "Installation",
    ACID_REFILL: "Acid Refilling & Charging",
    LABOR: "Labor Fee",
    WIRING: "Wiring & Setup",
    OTHER: "Other Service",
  },
  SERVICE_PRESETS: [
    "Inverter PCB Repair",
    "Battery Acid Refill & Equalization",
    "Solar Panel Wiring & Setup",
    "Labor / Installation Charge",
    "Battery Health Testing & Charging",
    "General Maintenance Service",
    "Inverter Repair & Component Replacement",
  ],
  PAYMENT_STATUSES: {
    PAID: "PAID",
    PARTIAL: "PARTIAL",
    UNPAID: "UNPAID",
  },
  PAYMENT_MODES: {
    CASH: "CASH",
    UPI: "UPI",
    CARD: "CARD",
    MIXED: "MIXED",
  },
  CUSTOMER_TYPES: {
    RETAIL: "RETAIL",
    BUSINESS: "BUSINESS",
    DEALER: "DEALER",
  },
  PRODUCT_CATEGORIES: {
    BATTERY: "BATTERY",
    INVERTER: "INVERTER",
    UPS: "UPS",
    ALTERNATOR: "ALTERNATOR",
  },
  BATTERY_TYPES: {
    INVERTER_BATTERY: "INVERTER_BATTERY",
    VEHICLE_BATTERY: "VEHICLE_BATTERY",
  },
  BATTERY_TYPE_LABELS: {
    INVERTER_BATTERY: "Inverter battery",
    VEHICLE_BATTERY: "Vehicle battery",
  },
  WARRANTY_TYPES: {
    STANDARD: "STANDARD",
    EXTENDED: "EXTENDED",
    PRO: "PRO",
  },
  PRODUCT_STATUSES: {
    ACTIVE: "ACTIVE",
    RETURNED: "RETURNED",
    REPLACED: "REPLACED",
  },
  LANGUAGES: {
    ENGLISH: "ENGLISH",
    HINDI: "HINDI",
    GUJARATI: "GUJARATI",
    MARATHI: "MARATHI",
  },
};
