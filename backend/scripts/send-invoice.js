import fetch from "node-fetch";

const API_URL = "http://localhost:8000/v1/invoices";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTZmMDAwNDg3ZjAyNThlOTRmMWVlMWQiLCJzaG9wSWQiOiI2OTZmMDAwNDg3ZjAyNThlOTRmMWVlMWIiLCJyb2xlIjoiT1dORVIiLCJpYXQiOjE3NzUyMjcwNDYsImV4cCI6MTc3NTgzMTg0Nn0.bLw0CO7YAIBtn18lmq2QVrRGosAstXry6MnvAE59fTw";
// 🔹 BASE CUSTOMER
const BASE_CUSTOMER = {
  full_name: "Rahul Patidar",
  whatsapp_number: "8085035032",
  alternate_phone: "8080808080",
  email: "rahulpatidar1009@gmail.com",
  date_of_birth: "2026-04-03",
  anniversary_date: "2026-04-03",
  preferred_language: "ENGLISH",
  customer_type: "RETAIL",
};

// 🔹 BASE DATE (FIXED)
const BASE_DATE = new Date("2026-04-05");

// 🔹 FORMAT → YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

// 🔹 ADD DAYS
const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// 🔹 ADD MONTHS
const addMonths = (base, months) => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
};

// 🎯 CONDITIONS
const paymentDays = [0, 3, 7, 15, -2];

const warrantyConditions = [
  { label: "3_DAY", days: 3 },
  { label: "15_DAY", days: 15 },
  { label: "EXPIRED", days: -1 },
];

const warrantyDurations = [1, 2]; // months

const products = ["Livguard", "Exide", "Amaron", "Luminous"];

const DAYS_TO_GENERATE = 4; // next 3-4 days
const REMINDER_TYPES = [
  "PAYMENT_DUE_TODAY",
  "PAYMENT_UPCOMING",
  "PAYMENT_OVERDUE",
  "WARRANTY_3_DAY",
  "WARRANTY_15_DAY",
  "WARRANTY_EXPIRED",
  "SERVICE_REMINDER",
];

let globalCounter = 0;

async function createScenarioInvoice(dayOffset, type) {
  const base = addDays(BASE_DATE, dayOffset);
  const today = base;

  let dueDate = base;
  let warrantyEnd = base;
  let durationMonths = 1;

  switch (type) {
    case "PAYMENT_DUE_TODAY":
      dueDate = base;
      break;

    case "PAYMENT_UPCOMING":
      dueDate = addDays(base, 3);
      break;

    case "PAYMENT_OVERDUE":
      dueDate = addDays(base, -2);
      break;

    case "WARRANTY_3_DAY":
      warrantyEnd = addDays(base, 3);
      break;

    case "WARRANTY_15_DAY":
      warrantyEnd = addDays(base, 15);
      break;

    case "WARRANTY_EXPIRED":
      warrantyEnd = addDays(base, -1);
      break;

    case "SERVICE_REMINDER":
      warrantyEnd = addDays(base, 0);
      break;
  }

  const startDateObj = new Date(warrantyEnd);
  startDateObj.setMonth(startDateObj.getMonth() - durationMonths);

  const warrantyStart = formatDate(startDateObj);
  const amount = 4000 + globalCounter * 200;
const isService = type === "SERVICE_REMINDER";
  const payload = {
    customer: BASE_CUSTOMER,
    invoice: {
      invoice_date: today,
      payment_status: "UNPAID",
      payment_mode: "CASH",
      amount_due: amount,
      due_date: dueDate,
    },
    invoice_items: [
      {
        serial_number: `SN-${type}-${globalCounter}-${Date.now()}`,
        product_name: `Battery-${type}`,
        product_category: "BATTERY",
        company: products[globalCounter % products.length],
        model_number: `M-${1000 + globalCounter}`,
        selling_price: amount,
        quantity: 1,
        warranty_type: "STANDARD",
        warranty_start_date: warrantyStart,
        warranty_duration_months: durationMonths,
        warranty_end_date: warrantyEnd,
        status: "ACTIVE",
        service_plan_enabled: isService,
        ...(isService && {
          service_plan: {
            service_interval_type: "MONTHLY",
            service_interval_value: 1,

            // 👉 IMPORTANT: service should start AFTER warranty
            service_start_date: addDays(warrantyEnd, 0),

            service_description: `Regular service for Battery-${type}`,
            service_charge: 0,
            total_services: 4,
            is_active: true,

            service_end_date: addMonths(warrantyEnd, 3),
          },
        }),
      },
    ],
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // 🔍 Extract response safely
    const savedInvoice = data?.data?.invoice || {};
    const savedItem = data?.data?.invoice_items?.[0] || {};

    // 🧠 CALCULATIONS (scheduler view)
    const paymentDiff = Math.floor(
      (new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24),
    );

    const warrantyDiff = Math.floor(
      (new Date(warrantyEnd) - new Date(today)) / (1000 * 60 * 60 * 24),
    );

    const paymentStatus =
      paymentDiff === 0
        ? "DUE TODAY"
        : paymentDiff < 0
          ? `OVERDUE (${Math.abs(paymentDiff)}d)`
          : `UPCOMING (${paymentDiff}d)`;

    const warrantyStatus =
      warrantyDiff === 3
        ? "3-DAY REMINDER"
        : warrantyDiff === 15
          ? "15-DAY REMINDER"
          : warrantyDiff < 0
            ? "EXPIRED"
            : `IN ${warrantyDiff} DAYS`;

    // 🧾 FINAL LOG
    console.log(`
==================== INVOICE DEBUG ====================

🎯 SCENARIO:
Type: ${type}
Day Offset: ${dayOffset}
Today: ${today}

📤 PAYLOAD:
Invoice Date: ${payload.invoice.invoice_date}
Due Date: ${payload.invoice.due_date}
Amount: ₹${payload.invoice.amount_due}

Warranty Start: ${payload.invoice_items[0].warranty_start_date}
Warranty End:   ${payload.invoice_items[0].warranty_end_date}
Duration: ${durationMonths} month

📥 RESPONSE:
Invoice Number: ${savedInvoice.invoice_number || "N/A"}
Invoice ID: ${savedInvoice._id || "N/A"}

Saved Due Date: ${savedInvoice.due_date || "N/A"}
Saved Warranty End: ${savedItem.warranty_end_date || "N/A"}

🔍 DERIVED STATUS (Scheduler View):
Payment → ${paymentStatus}
Warranty → ${warrantyStatus}

📦 PRODUCT:
Name: ${payload.invoice_items[0].product_name}
Serial: ${payload.invoice_items[0].serial_number}
Company: ${payload.invoice_items[0].company}

=======================================================
`);

    globalCounter++;
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}
async function run() {
  console.log("🔥 Generating structured reminders...");

  for (let day = 0; day < DAYS_TO_GENERATE; day++) {
    console.log(`\n📅 Day Offset: ${day}`);

    for (const type of REMINDER_TYPES) {
      await createScenarioInvoice(day, type);
    }
  }

  console.log("\n✅ Done - All reminder scenarios seeded");
}

run();