/**
 * Test script for Twilio WhatsApp messaging
 *
 * Usage:
 *   1) Set env vars in backend/.env:
 *        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        TWILIO_AUTH_TOKEN=your_auth_token
 *        TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
 *
 *   2) Run from project root:
 *        node backend/scripts/test-twilio.js
 *
 *      Or run from backend/ folder:
 *        node scripts/test-twilio.js
 *
 *   3) (Optional) Override the recipient number:
 *        TEST_TO=+919876543210 node backend/scripts/test-twilio.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env BEFORE anything that reads process.env
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Dynamic import ensures twilio.js evaluates AFTER dotenv has populated process.env.
// Static imports are hoisted and run before any code in this file, which would
// cause the client to initialise before the .env vars are available.
const { verifyTwilioConnection, sendWhatsAppMessage } =
  await import("../config/twilio.js");

// ─── Config ──────────────────────────────────────────────────────────────────
const TO_NUMBER = process.env.TEST_TO || "+918085035032"; // override via env var
const TEST_MESSAGE =
  "Hello from Sale@Service! ✅ Twilio WhatsApp integration is working.";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function printSection(title) {
  console.log("\n" + "─".repeat(60));
  console.log(` ${title}`);
  console.log("─".repeat(60));
}

function checkEnvVars() {
  printSection("1. Checking Environment Variables");

  const required = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  };

  let allPresent = true;

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      console.error(`  ✗ ${key} — NOT SET`);
      allPresent = false;
    } else {
      // Mask sensitive values
      const masked =
        key === "TWILIO_AUTH_TOKEN"
          ? value.slice(0, 4) + "****" + value.slice(-4)
          : value;
      console.log(`  ✓ ${key} = ${masked}`);
    }
  }

  if (!allPresent) {
    console.error(
      "\n  [ERROR] One or more env vars are missing. Check your .env file.",
    );
    process.exit(1);
  }

  console.log("\n  All required env vars are present.");
}

async function testConnection() {
  printSection("2. Verifying Twilio Connection (Account Lookup)");
  try {
    const account = await verifyTwilioConnection();
    console.log(`  ✓ Connected to Twilio`);
    console.log(`    Account Name : ${account.friendlyName}`);
    console.log(`    Account SID  : ${account.sid}`);
    console.log(`    Status       : ${account.status}`);
    return true;
  } catch (err) {
    console.error(`  ✗ Connection failed: ${err.message}`);
    return false;
  }
}

async function testSendMessage() {
  printSection("3. Sending Test WhatsApp Message");
  console.log(`  To      : ${TO_NUMBER}`);
  console.log(`  Message : ${TEST_MESSAGE}`);
  console.log();

  try {
    const msg = await sendWhatsAppMessage(TO_NUMBER, TEST_MESSAGE);
    console.log(`  ✓ Message sent successfully!`);
    console.log(`    SID    : ${msg.sid}`);
    console.log(`    Status : ${msg.status}`);
    console.log(`    From   : ${msg.from}`);
    console.log(`    To     : ${msg.to}`);
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to send message: ${err.message}`);
    if (err.code) {
      console.error(`    Twilio error code: ${err.code}`);
      if (err.code === 63007) {
        console.error(`
  ──────────────────────────────────────────────────────────
  FIX for error 63007 — "Channel not found for From address"
  ──────────────────────────────────────────────────────────
  Your TWILIO_WHATSAPP_NUMBER is not WhatsApp-enabled.

  For DEVELOPMENT (sandbox):
    1. Set in .env:  TWILIO_WHATSAPP_NUMBER=+14155238886
    2. The recipient must opt-in first by sending:
         "join <your-sandbox-keyword>"
       to +14155238886 on WhatsApp.
    3. Find your sandbox keyword at:
       https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

  For PRODUCTION:
    Apply for a WhatsApp-approved Twilio sender at:
    https://console.twilio.com/us1/develop/sms/whatsapp/senders
  ──────────────────────────────────────────────────────────`);
      }
    }
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n============================");
  console.log("  Twilio WhatsApp Test Script");
  console.log("============================");

  // Step 1 – env vars
  checkEnvVars();

  // Step 2 – verify connection
  const connected = await testConnection();
  if (!connected) {
    console.error(
      "\n[ABORT] Cannot proceed without a valid Twilio connection.",
    );
    process.exit(1);
  }

  // Step 3 – send message
  const sent = await testSendMessage();

  printSection("Summary");
  console.log(`  Connection : ${connected ? "✓ OK" : "✗ FAILED"}`);
  console.log(`  Message    : ${sent ? "✓ SENT" : "✗ FAILED"}`);
  console.log();

  process.exit(sent ? 0 : 1);
}

main().catch((err) => {
  console.error("\n[UNHANDLED ERROR]", err);
  process.exit(1);
});
