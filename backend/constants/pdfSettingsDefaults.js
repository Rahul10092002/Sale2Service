export const DEFAULT_PDF_SETTINGS = {
  // Header & Shop Info
  show_logo: true,
  show_shop_name: true,
  show_shop_address: true,
  show_shop_phone: true,
  show_shop_email: true,
  show_shop_gst: true,
  header_title: "TAX INVOICE",
  show_invoice_number: true,

  // Customer Box
  show_customer_name: true,
  show_customer_address: true,
  show_customer_mobile: true,
  show_customer_gst: true,
  show_customer_email: true,

  // Invoice Details Box
  show_invoice_date: true,
  show_due_date: true,
  show_payment_status: true,
  show_payment_mode: true,
  show_reverse_charge: true,

  // Items Table Columns & Specifications
  show_qty_column: true,
  show_rate_column: true,
  show_taxable_column: true,
  show_tax_column: true,
  show_item_brand: true,
  show_item_model: true,
  show_item_serial: true,
  show_item_warranty: true,
  show_item_service_plan: true,
  show_item_notes: true,

  // Totals & Breakdown
  show_subtotal: true,
  show_discount: true,
  show_exchange_price: true,
  show_tax_breakdown: true,
  show_amount_paid: true,
  show_balance_due: true,
  show_amount_in_words: true,

  // Bank, Payment & Notes
  show_bank_details: true,
  show_upi_qr: true,
  show_notes: true,

  // Footer & Terms
  show_terms: true,
  terms_and_conditions: [
    "Goods once sold will not be taken back or exchanged without valid reason.",
    "Warranty claims are subject to manufacturer terms & conditions.",
    "Subject to local jurisdiction only.",
  ],
  show_signature: true,
  show_footer_note: true,
  footer_note: "This is a computer-generated invoice.",
};

const getBool = (settings, key) =>
  typeof settings[key] === "boolean" ? settings[key] : DEFAULT_PDF_SETTINGS[key];

/**
 * Deep merge shop pdf_settings with default fallbacks.
 * Preserves explicit false booleans, empty strings, and empty arrays.
 */
export const mergePdfSettings = (inputSettings = {}) => {
  const settings = inputSettings && typeof inputSettings === "object" ? inputSettings : {};

  return {
    // Header & Shop Info
    show_logo: getBool(settings, "show_logo"),
    show_shop_name: getBool(settings, "show_shop_name"),
    show_shop_address: getBool(settings, "show_shop_address"),
    show_shop_phone: getBool(settings, "show_shop_phone"),
    show_shop_email: getBool(settings, "show_shop_email"),
    show_shop_gst: getBool(settings, "show_shop_gst"),
    header_title: typeof settings.header_title === "string" ? settings.header_title : DEFAULT_PDF_SETTINGS.header_title,
    show_invoice_number: getBool(settings, "show_invoice_number"),

    // Customer Box
    show_customer_name: getBool(settings, "show_customer_name"),
    show_customer_address: getBool(settings, "show_customer_address"),
    show_customer_mobile: getBool(settings, "show_customer_mobile"),
    show_customer_gst: getBool(settings, "show_customer_gst"),
    show_customer_email: getBool(settings, "show_customer_email"),

    // Invoice Details Box
    show_invoice_date: getBool(settings, "show_invoice_date"),
    show_due_date: getBool(settings, "show_due_date"),
    show_payment_status: getBool(settings, "show_payment_status"),
    show_payment_mode: getBool(settings, "show_payment_mode"),
    show_reverse_charge: getBool(settings, "show_reverse_charge"),

    // Items Table Columns & Specifications
    show_qty_column: getBool(settings, "show_qty_column"),
    show_rate_column: getBool(settings, "show_rate_column"),
    show_taxable_column: getBool(settings, "show_taxable_column"),
    show_tax_column: getBool(settings, "show_tax_column"),
    show_item_brand: getBool(settings, "show_item_brand"),
    show_item_model: getBool(settings, "show_item_model"),
    show_item_serial: getBool(settings, "show_item_serial"),
    show_item_warranty: getBool(settings, "show_item_warranty"),
    show_item_service_plan: getBool(settings, "show_item_service_plan"),
    show_item_notes: getBool(settings, "show_item_notes"),

    // Totals Breakdown
    show_subtotal: getBool(settings, "show_subtotal"),
    show_discount: getBool(settings, "show_discount"),
    show_exchange_price: getBool(settings, "show_exchange_price"),
    show_tax_breakdown: getBool(settings, "show_tax_breakdown"),
    show_amount_paid: getBool(settings, "show_amount_paid"),
    show_balance_due: getBool(settings, "show_balance_due"),
    show_amount_in_words: getBool(settings, "show_amount_in_words"),

    // Bank, Payment & Notes
    show_bank_details: getBool(settings, "show_bank_details"),
    show_upi_qr: getBool(settings, "show_upi_qr"),
    show_notes: getBool(settings, "show_notes"),

    // Footer & Terms
    show_terms: getBool(settings, "show_terms"),
    terms_and_conditions: Array.isArray(settings.terms_and_conditions)
      ? settings.terms_and_conditions
      : [...DEFAULT_PDF_SETTINGS.terms_and_conditions],
    show_signature: getBool(settings, "show_signature"),
    show_footer_note: getBool(settings, "show_footer_note"),
    footer_note: typeof settings.footer_note === "string" ? settings.footer_note : DEFAULT_PDF_SETTINGS.footer_note,
  };
};
