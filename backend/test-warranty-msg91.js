import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import mongoose from "mongoose";
import { sendWhatsappMessageViaMSG91 } from "./config/msg91.js";

// Ensure environment variables are loaded
if (!process.env.MSG91_API_ENDPOINT || !process.env.MSG91_AUTHKEY) {
  console.error("Missing MSG91 credentials in .env file");
  process.exit(1);
}

// Replace this with your test phone number (must be registered on WhatsApp)
const TEST_PHONE_NUMBER = "918085035032"; 
const TEST_SHOP_PHONE = "918085035032";

async function testWarrantyExpiring() {
  console.log("\n=== Testing warranty_expiring template ===");
  
  const payload = {
    templateName: "warranty_expiring",
    to: TEST_PHONE_NUMBER,
    components: {
      1: "Rahul",
      2: "Samsung AC",
      3: "30", // Days remaining
      4: TEST_SHOP_PHONE,
      5: "राजदीप पावर",
    },
    buttons: [{ subtype: "url", value: TEST_SHOP_PHONE }],
    campaignName: "test_warranty_expiring",
  };

  try {
    const result = await sendWhatsappMessageViaMSG91(payload);
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Failed to send warranty_expiring:", error);
  }
}

async function testWarrantyExpired() {
  console.log("\n=== Testing warranty_expired template ===");
  
  const payload = {
    templateName: "warranty_expired",
    to: TEST_PHONE_NUMBER,
    components: {
      1: "Rahul",
      2: "LG Refrigerator",
      3: TEST_SHOP_PHONE,
      4: "राजदीप पावर",
    },
    // url is default, but specifying subtype explicitly is safe
    buttons: [{ subtype: "url", value: TEST_SHOP_PHONE }], 
    campaignName: "test_warranty_expired",
  };

  try {
    const result = await sendWhatsappMessageViaMSG91(payload);
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Failed to send warranty_expired:", error);
  }
}

async function runTests() {
  console.log("Starting MSG91 Warranty Templates Test...\n");
  
  // Optional: connect to mongoose if your MSG91 config depends on MessageLog schema
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("Connected to MongoDB for logging");
    } catch (err) {
      console.error("Failed to connect to MongoDB. Logging may be skipped.", err);
    }
  }

  await testWarrantyExpiring();
  await testWarrantyExpired();

  console.log("\nTests finished.");
  process.exit(0);
}

runTests();
