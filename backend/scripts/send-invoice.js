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

async function createInvoice(i) {
  const paymentOffset = paymentDays[i % paymentDays.length];
  const warrantyCondition =
    warrantyConditions[i % warrantyConditions.length];

  const durationMonths = warrantyDurations[i % warrantyDurations.length];

  const amount = 4000 + i * 500;

  // 🔥 WARRANTY END (based on scheduler trigger)
  const warrantyEnd = addDays(BASE_DATE, warrantyCondition.days);

  // thoda random add kar (optional)
  const randomShift = Math.floor(Math.random() * 2);
  const finalWarrantyEnd = addDays(warrantyEnd, randomShift);

  // 🔥 WARRANTY START (reverse calculate from end)
  const startDateObj = new Date(finalWarrantyEnd);
  startDateObj.setMonth(startDateObj.getMonth() - durationMonths);

  const warrantyStart = formatDate(startDateObj);

  const payload = {
    customer: BASE_CUSTOMER,
    invoice: {
      invoice_date: formatDate(BASE_DATE),
      payment_status: "UNPAID",
      payment_mode: "CASH",
      amount_due: amount,
      due_date: addDays(BASE_DATE, paymentOffset),
    },
    invoice_items: [
      {
        serial_number: `SN-${i}-${Date.now()}`,
        product_name: `${products[i % products.length]} ${i}`,
        product_category: "BATTERY",
        company: products[i % products.length],
        model_number: `M-${1000 + i}`,
        selling_price: amount,
        quantity: 1,

        // ✅ WARRANTY FIXED
        warranty_type: "STANDARD",
        warranty_start_date: warrantyStart,
        warranty_duration_months: durationMonths,
        warranty_end_date: warrantyEnd,

        status: "ACTIVE",
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

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ API ERROR ${res.status}`, text);
      return;
    }

    const data = await res.json();

   const today = formatDate(BASE_DATE);

   // calculate helper flags
   const daysDiff = Math.floor(
     (new Date(warrantyEnd) - new Date(today)) / (1000 * 60 * 60 * 24),
   );

   const paymentDiff = Math.floor(
     (new Date(payload.invoice.due_date) - new Date(today)) /
       (1000 * 60 * 60 * 24),
   );

   // derive readable status
   const warrantyStatus =
     daysDiff === 3
       ? "3-DAY REMINDER"
       : daysDiff === 15
         ? "15-DAY REMINDER"
         : daysDiff < 0
           ? "EXPIRED"
           : `${daysDiff} DAYS LEFT`;

   const paymentStatus =
     paymentDiff === 0
       ? "DUE TODAY"
       : paymentDiff < 0
         ? `OVERDUE (${Math.abs(paymentDiff)}d)`
         : `UPCOMING (${paymentDiff}d)`;

   // final log
   console.log(`
✅ Invoice ${i + 1} | ${data?.data?.invoice?.invoice_number || "NO NUMBER"}
👤 Customer: ${payload.customer.full_name}
📦 Product: ${payload.invoice_items[0].product_name}
🔢 Serial: ${payload.invoice_items[0].serial_number}

💰 Amount: ₹${amount}
📅 Invoice Date: ${today}
📅 Due Date: ${payload.invoice.due_date} → ${paymentStatus}

🛡 Warranty:
   Start: ${payload.invoice_items[0].warranty_start_date}
   End:   ${warrantyEnd}
   Duration: ${durationMonths} Month(s)
   Status: ${warrantyStatus}

⚙️ Raw Condition:
   Payment Offset: ${paymentOffset}d
   Warranty Condition: ${warrantyCondition.label} (${warrantyCondition.days}d)

---------------------------------------------
`);
  } catch (err) {
    console.error(`❌ Error ${i + 1}`, err.message);
  }
}

// 🚀 RUN
async function run() {
  console.log("🔥 Seeding 50 invoices (DATE ONLY FIXED)...");

  for (let i = 0; i < 50; i++) {
    await createInvoice(i);
  }

  console.log("✅ Done");
}

run();