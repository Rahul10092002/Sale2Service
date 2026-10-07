// Simple test script to call sendWhatsappMessageViaMSG91
// Usage:
// 1) Ensure env vars: MSG91_AUTHKEY, MSG91_NAMESPACE, MSG91_NUMBER, MSG91_API_ENDPOINT
// 2) Run: node backend/scripts/test-msg91.js

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the backend/.env when running from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { sendWhatsappMessageViaMSG91 } from "../config/msg91.js";

console.log("MSG91_API_ENDPOINT:", process.env.MSG91_API_ENDPOINT);

async function run() {
  const to = "918085035032"; // replace with real number

  const components = {
    1: "Rahul Patidar", // customerName
    2: "Rajdeep Power Point", // shop name
    3: "INV-2026-045", // invoice number
    4: "27/02/2026", // invoice date
    5: "5000.00", // total amount
    6: "2000.00", // amount paid
    7: "3000.00", // amount due
    8: "Partial", // payment status
    9: "9893705221", // shop contact number
  };

  try {
    const resp = await sendWhatsappMessageViaMSG91({
      templateName: "invoice_generated_notification",
      to,
      components,
      campaignName: "invoice_generated_notification",
      userName: process.env.TEST_USER || "System",
      messageType: "invoice_generated_notification",
      media: {
        url: "https://example.com/invoices/Invoice-INV-2026-045.pdf",
        filename: "Invoice-INV-2026-045.pdf",
      },
    });

    console.log("MSG91 response:", resp);
  } catch (err) {
    console.error("Error calling MSG91:", err);
  }
}

run();
