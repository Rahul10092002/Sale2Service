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

  const components = [
    "INV-2026-045", // {{1}} invoice number
    "27-02-2026", // {{2}} date
    "2500", // {{3}} total amount
    "05-03-2026", // {{4}} due date
    "राजदीप पावर पॉइंट", // {{5}} shop name
  ];

  try {
    const resp = await sendWhatsappMessageViaMSG91({
      templateName: "invoice_create",
      to,
      components,
      campaignName: "invoice_create",
      userName: process.env.TEST_USER || "System",
      messageType: "invoice_create",
    });

    console.log("MSG91 response:", resp);
  } catch (err) {
    console.error("Error calling MSG91:", err);
  }
}

run();
