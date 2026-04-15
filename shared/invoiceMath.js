export const GST_RATE_PERCENT = 18;
export const GST_RATE_DECIMAL = GST_RATE_PERCENT / 100;

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const roundCurrency = (value) =>
  Number(toNumber(value, 0).toFixed(2));

export const getInvoiceItemQuantity = (item = {}) => {
  const quantity = toNumber(item.quantity, 0);
  return quantity > 0 ? quantity : 0;
};

export const getInvoiceItemUnitPrice = (item = {}) => {
  const sellingPrice = toNumber(item.selling_price, NaN);
  if (Number.isFinite(sellingPrice)) {
    return sellingPrice;
  }

  return toNumber(item.price, 0);
};

export const getInvoiceItemAmount = (item = {}) =>
  roundCurrency(getInvoiceItemUnitPrice(item) * getInvoiceItemQuantity(item));

export const derivePaymentStatus = ({
  amountPaid = 0,
  totalAmount = 0,
  fallbackStatus = "UNPAID",
} = {}) => {
  const normalizedTotal = roundCurrency(Math.max(0, totalAmount));
  const normalizedPaid = roundCurrency(Math.max(0, amountPaid));
  const normalizedFallback = String(fallbackStatus || "UNPAID").toUpperCase();

  if (normalizedTotal === 0 || normalizedPaid >= normalizedTotal) {
    return "PAID";
  }

  if (normalizedPaid > 0) {
    return "PARTIAL";
  }

  return ["PAID", "PARTIAL", "UNPAID"].includes(normalizedFallback)
    ? normalizedFallback
    : "UNPAID";
};

export const calculateInvoiceTotals = ({
  invoice = {},
  items = [],
  taxRate = GST_RATE_DECIMAL,
} = {}) => {
  const grossItemTotal = roundCurrency(
    items.reduce((sum, item) => sum + getInvoiceItemAmount(item), 0),
  );

  const discount = roundCurrency(Math.max(0, toNumber(invoice.discount, 0)));
  const isTaxInclusive = invoice.is_tax_inclusive !== false;

  let subtotal = grossItemTotal;
  let tax = 0;
  let totalBeforeDiscount = grossItemTotal;

  if (isTaxInclusive) {
    subtotal = grossItemTotal / (1 + taxRate);
    tax = grossItemTotal - subtotal;
    totalBeforeDiscount = grossItemTotal;
  } else {
    subtotal = grossItemTotal;
    tax = subtotal * taxRate;
    totalBeforeDiscount = subtotal + tax;
  }

  const totalAmount = Math.max(0, totalBeforeDiscount - discount);
  const amountPaid = roundCurrency(Math.max(0, toNumber(invoice.amount_paid, 0)));
  const amountDue = Math.max(0, totalAmount - amountPaid);
  const paymentStatus = derivePaymentStatus({
    amountPaid,
    totalAmount,
    fallbackStatus: invoice.payment_status,
  });

  return {
    tax_rate: GST_RATE_PERCENT,
    is_tax_inclusive: isTaxInclusive,
    gross_item_total: roundCurrency(grossItemTotal),
    subtotal: roundCurrency(subtotal),
    discount,
    tax: roundCurrency(tax),
    total_amount: roundCurrency(totalAmount),
    amount_paid: amountPaid,
    amount_due: roundCurrency(amountDue),
    payment_status: paymentStatus,
  };
};

export const buildInvoiceNumberPreview = ({
  date = new Date(),
  sequence = 1,
} = {}) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  const year = String(safeDate.getFullYear()).slice(-2);
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const paddedSequence = String(Math.max(1, toNumber(sequence, 1))).padStart(
    3,
    "0",
  );

  return {
    datePart,
    sequence: Math.max(1, toNumber(sequence, 1)),
    invoice_number: `INV-${datePart}-${paddedSequence}`,
  };
};
