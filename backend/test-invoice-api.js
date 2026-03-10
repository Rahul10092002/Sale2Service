// Invoice API Test Script
// Run this in the console or as a separate test file

// Test payload matching the frontend structure
const testInvoicePayload = {
  customer: {
    full_name: "John Doe",
    whatsapp_number: "+919876543210",
    email: "john@example.com",
    customer_type: "RETAIL",
    address: {
      line1: "123 Main Street",
      line2: "Near Park",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
    },
  },
  invoice: {
    invoice_date: "2026-01-26",
    payment_status: "PAID",
    payment_mode: "CASH",
    discount: 100,
    notes: "Test invoice",
  },
  invoice_items: [
    {
      serial_number: "BAT12345",
      product_name: "Exide Battery 150Ah",
      product_category: "BATTERY",
      company: "Exide",
      model_number: "EI150",
      selling_price: 15000,
      cost_price: 12000,
      quantity: 1,
      warranty_type: "STANDARD",
      warranty_start_date: "2026-01-26",
      warranty_duration_months: 12,
      capacity_rating: "150Ah",
      voltage: "12V",
    },
    {
      serial_number: "INV6789",
      product_name: "Luminous Inverter 1500VA",
      product_category: "INVERTER",
      company: "Luminous",
      model_number: "LUM1500",
      selling_price: 8000,
      cost_price: 6500,
      quantity: 1,
      warranty_type: "STANDARD",
      warranty_start_date: "2026-01-26",
      warranty_duration_months: 24,
      capacity_rating: "1500VA",
      voltage: "12V",
    },
  ],
};

console.log("Test Invoice Payload:");
console.log(JSON.stringify(testInvoicePayload, null, 2));

// Expected API Response Structure:
const expectedResponse = {
  success: true,
  message: "Invoice created successfully",
  data: {
    invoice: {
      // Invoice object with populated customer
    },
    invoice_items: [
      // Array of invoice items
    ],
    invoice_number: "INV-2026-0001",
    total_amount: 23000,
  },
};

console.log("Expected Response Structure:");
console.log(JSON.stringify(expectedResponse, null, 2));
