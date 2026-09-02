import { validateInvoicePayload } from "../utils/invoiceValidation.js";

function runTests() {
  console.log("=== Running Invoice Service Validation Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Pure Product Invoice Payload
  const productPayload = {
    customer: {
      full_name: "Rahul Sharma",
      whatsapp_number: "9876543210",
    },
    invoice: {
      invoice_date: "2026-09-02",
      payment_status: "PAID",
      payment_mode: "UPI",
      is_tax_inclusive: true,
      discount: 100,
    },
    invoice_items: [
      {
        item_type: "PRODUCT",
        serial_number: "BAT-1001",
        product_name: "Exide Inverter Battery 150Ah",
        product_category: "BATTERY",
        battery_type: "INVERTER_BATTERY",
        company: "Exide",
        model_number: "IT500",
        selling_price: 12000,
        quantity: 1,
        warranty_start_date: "2026-09-02",
        warranty_duration_months: 36,
      },
    ],
  };

  const productVal = validateInvoicePayload(productPayload);
  assert(productVal.isValid, "Pure Product Invoice should be valid");
  assert(productVal.totals?.total_amount === 11900, "Pure Product Total after ₹100 discount should be 11900");

  // 2. Pure Service / Repair Invoice Payload
  const servicePayload = {
    customer: {
      full_name: "Amit Patel",
      whatsapp_number: "9123456789",
    },
    invoice: {
      invoice_date: "2026-09-02",
      payment_status: "PAID",
      payment_mode: "CASH",
      is_tax_inclusive: true,
      discount: 0,
    },
    invoice_items: [
      {
        item_type: "SERVICE",
        service_category: "REPAIR",
        product_name: "Inverter PCB Repair & Component Replacement",
        selling_price: 1500,
        quantity: 1,
        warranty_duration_months: 3,
        notes: "Replaced 2 MOSFETs and repaired transformer trace",
      },
    ],
  };

  const serviceVal = validateInvoicePayload(servicePayload);
  assert(serviceVal.isValid, "Pure Service Invoice should be valid");
  assert(
    servicePayload.invoice_items[0].serial_number &&
    servicePayload.invoice_items[0].serial_number.startsWith("SRV-"),
    "Service item should get auto-generated SRV- serial number"
  );
  assert(
    servicePayload.invoice_items[0].warranty_end_date instanceof Date,
    "Service repair warranty end date should be computed automatically"
  );
  assert(serviceVal.totals?.total_amount === 1500, "Service Invoice total should be 1500");

  // 3. Mixed Invoice Payload (1 Product + 1 Service)
  const mixedPayload = {
    customer: {
      full_name: "Priya Singh",
      whatsapp_number: "9988776655",
    },
    invoice: {
      invoice_date: "2026-09-02",
      payment_status: "PAID",
      payment_mode: "CARD",
      is_tax_inclusive: true,
      discount: 50,
    },
    invoice_items: [
      {
        item_type: "PRODUCT",
        serial_number: "SOL-8001",
        product_name: "Luminous Solar Panel 165W",
        product_category: "SOLAR_PANEL",
        company: "Luminous",
        model_number: "LUM165",
        selling_price: 6000,
        quantity: 1,
        warranty_start_date: "2026-09-02",
        warranty_duration_months: 60,
      },
      {
        item_type: "SERVICE",
        service_category: "INSTALLATION",
        product_name: "Solar Panel Mounting & Wiring Labor",
        selling_price: 800,
        quantity: 1,
        notes: "Roof mounting structure + 10m DC wire connection",
      },
    ],
  };

  const mixedVal = validateInvoicePayload(mixedPayload);
  assert(mixedVal.isValid, "Mixed Product + Service Invoice should be valid");
  assert(mixedVal.totals?.total_amount === 6750, "Mixed Invoice total should be (6000 + 800) - 50 = 6750");

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
