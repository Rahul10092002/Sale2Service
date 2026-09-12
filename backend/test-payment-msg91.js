import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import mongoose from "mongoose";
import { sendWhatsappMessageViaMSG91 } from "./config/msg91.js";

const TEST_PHONE_NUMBER = "918085035032"; 
const TEST_SHOP_PHONE = "918085035032";

async function testPaymentMissed() {
  console.log("\n=== Testing payment_missed template (URL button) ===");
  
  const payload = {
    templateName: "payment_missed",
    to: TEST_PHONE_NUMBER,
    components: {
      1: "राहुल शर्मा",
      2: "4999.99",
      3: "08-04-2026",
      4: "INV-260409-002",
      5: "SAFAS",
      6: TEST_SHOP_PHONE,
      7: "राजदीप पावर",
    },
    buttons: [{ subtype: "url", value: TEST_SHOP_PHONE }],
    campaignName: "test_payment_missed",
  };

  try {
    const result = await sendWhatsappMessageViaMSG91(payload);
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Failed to send payment_missed:", error);
  }
}

async function testPaymentReminders() {
  console.log("\n=== Testing payment_reminders template (QuickReply button) ===");
  
  const payload = {
    templateName: "payment_reminders",
    to: TEST_PHONE_NUMBER,
    components: {
      1: "राहुल शर्मा",
      2: "4999.99",
      3: "INV-260409-002",
      4: "SAFAS",
      5: "08-04-2026",
      6: TEST_SHOP_PHONE,
      7: "राजदीप पावर",
    },
    buttons: [{ subtype: "quick_reply", value: TEST_SHOP_PHONE }],
    campaignName: "test_payment_reminders",
  };

  try {
    const result = await sendWhatsappMessageViaMSG91(payload);
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Failed to send payment_reminders:", error);
  }
}

async function runTests() {
  console.log("Starting MSG91 Payment Templates Test...\n");
  await testPaymentMissed();
  await testPaymentReminders();
  console.log("\nTests finished.");
  process.exit(0);
}

runTests();
