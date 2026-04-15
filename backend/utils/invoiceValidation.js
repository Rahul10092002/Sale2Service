import { calculateInvoiceTotals } from "../../shared/invoiceMath.js";

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const WHATSAPP_REGEX = /^\+?[\d\s-()]{10,15}$/;
const VALID_PAYMENT_MODES = new Set([
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "MIXED",
  "CREDIT",
]);
const VALID_PAYMENT_STATUSES = new Set(["PAID", "PARTIAL", "UNPAID"]);

const isBlank = (value) => !String(value || "").trim();

export const validateInvoicePayload = ({
  customer,
  invoice,
  invoice_items,
  requireInvoiceNumber = false,
}) => {
  const errors = [];

  if (!customer || typeof customer !== "object") {
    errors.push("Customer details are required");
  }

  if (!invoice || typeof invoice !== "object") {
    errors.push("Invoice details are required");
  }

  if (!Array.isArray(invoice_items) || invoice_items.length === 0) {
    errors.push("At least one invoice item is required");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      totals: null,
    };
  }

  if (isBlank(customer.full_name)) {
    errors.push("Customer full name is required");
  }

  if (isBlank(customer.whatsapp_number)) {
    errors.push("WhatsApp number is required");
  } else if (!WHATSAPP_REGEX.test(String(customer.whatsapp_number).trim())) {
    errors.push("Enter a valid WhatsApp number");
  }

  if (customer.email && !EMAIL_REGEX.test(String(customer.email).trim())) {
    errors.push("Enter a valid email address");
  }

  if (!invoice.invoice_date) {
    errors.push("Invoice date is required");
  }

  if (
    requireInvoiceNumber &&
    (!invoice.invoice_number || !String(invoice.invoice_number).trim())
  ) {
    errors.push("Invoice number is required");
  }

  const paymentStatus = String(invoice.payment_status || "UNPAID").toUpperCase();
  if (!VALID_PAYMENT_STATUSES.has(paymentStatus)) {
    errors.push("Payment status is invalid");
  }

  const paymentMode = String(invoice.payment_mode || "CASH").toUpperCase();
  if (!VALID_PAYMENT_MODES.has(paymentMode)) {
    errors.push("Payment mode is invalid");
  }

  const totals = calculateInvoiceTotals({
    invoice: {
      ...invoice,
      payment_status: paymentStatus,
    },
    items: invoice_items,
  });

  if (Number(invoice.discount || 0) < 0) {
    errors.push("Discount cannot be negative");
  }

  if (paymentStatus === "UNPAID" && !invoice.due_date) {
    errors.push("Due date is required for unpaid invoices");
  }

  if (paymentStatus === "PARTIAL") {
    if (!invoice.due_date) {
      errors.push("Due date is required for partial invoices");
    }

    if (!(Number(invoice.amount_paid) > 0)) {
      errors.push("Amount paid must be greater than 0 for partial invoices");
    } else if (Number(invoice.amount_paid) >= totals.total_amount) {
      errors.push(
        "Amount paid must be less than the total amount for partial invoices",
      );
    }
  }

  const seenSerialNumbers = new Set();

  invoice_items.forEach((item, index) => {
    const label = `Item ${index + 1}`;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.selling_price ?? item.price);

    if (isBlank(item.serial_number)) {
      errors.push(`${label}: serial number is required`);
    } else {
      const normalizedSerial = String(item.serial_number).trim().toUpperCase();
      if (seenSerialNumbers.has(normalizedSerial)) {
        errors.push(`${label}: duplicate serial number ${normalizedSerial}`);
      }
      seenSerialNumbers.add(normalizedSerial);
    }

    if (isBlank(item.product_name)) {
      errors.push(`${label}: product name is required`);
    }

    if (isBlank(item.company)) {
      errors.push(`${label}: company or brand is required`);
    }

    if (isBlank(item.model_number)) {
      errors.push(`${label}: model number is required`);
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      errors.push(`${label}: selling price must be greater than 0`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`${label}: quantity must be greater than 0`);
    }

    if (!item.warranty_start_date) {
      errors.push(`${label}: warranty start date is required`);
    }

    if (
      item.product_category === "BATTERY" &&
      !String(item.battery_type || "").trim()
    ) {
      errors.push(`${label}: battery type is required`);
    }

    if (item.battery_type === "VEHICLE_BATTERY") {
      if (isBlank(item.vehicle_name)) {
        errors.push(`${label}: vehicle name is required`);
      }

      if (isBlank(item.vehicle_number_plate)) {
        errors.push(`${label}: number plate is required`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totals,
  };
};
