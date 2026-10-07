import fs from "fs";
import path from "path";
import readline from "readline";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Load environment variables from backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Customer from "../models/Customer.js";
import Shop from "../models/Shop.js";

const DEFAULT_SHOP_ID = "69bd050b4f47d2c7e3d5c433";
const DEFAULT_CSV_PATH = path.resolve(__dirname, "../Cleaned_Contacts_V2.csv");

/**
 * Normalizes phone numbers to clean numeric format.
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  let clean = String(rawPhone).replace(/[^\d+]/g, "").trim();
  if (clean.startsWith("+91")) {
    clean = clean.substring(3);
  } else if (clean.startsWith("91") && clean.length === 12) {
    clean = clean.substring(2);
  } else if (clean.startsWith("0") && clean.length === 11) {
    clean = clean.substring(1);
  }
  return clean;
}

/**
 * Detects if text contains Devanagari (Hindi) script characters.
 */
function isHindiText(str) {
  return /[\u0900-\u097F]/.test(str || "");
}

/**
 * Parses CSV lines handling quoted fields correctly.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function runImport() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const positional = args.filter((a) => !a.startsWith("--"));

  const shopId = positional[0] || process.env.SHOP_ID || DEFAULT_SHOP_ID;
  const csvPath = positional[1] || DEFAULT_CSV_PATH;

  console.log("==================================================");
  console.log("   WARRANTYDESK CUSTOMER CSV IMPORT SCRIPT");
  console.log("==================================================");
  console.log(`📌 Target Shop ID : ${shopId}`);
  console.log(`📁 Source CSV File: ${csvPath}`);
  console.log(`⚙️  Execution Mode : ${isDryRun ? "DRY RUN (No DB changes)" : "LIVE IMPORT"}`);
  console.log("==================================================\n");

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    console.error(`❌ Invalid Shop ObjectId: "${shopId}"`);
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: "${csvPath}"`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is missing from environment variables.");
    process.exit(1);
  }

  if (!isDryRun) {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const shop = await Shop.findById(shopId);
    if (!shop) {
      console.warn(`⚠️ Warning: Shop with ID "${shopId}" was not found in database. Proceeding with ObjectId reference...`);
    } else {
      console.log(`🏬 Target Shop Name: "${shop.shop_name}" (${shop.shop_name_hi || "N/A"})`);
    }
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers = null;
  let totalRows = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedNoPhone = 0;
  let errorCount = 0;

  const shopObjectId = new mongoose.Types.ObjectId(shopId);

  for await (const rawLine of rl) {
    if (!rawLine.trim()) continue;

    if (!headers) {
      headers = parseCsvLine(rawLine).map((h) => h.replace(/^\uFEFF/, "").trim());
      continue;
    }

    totalRows++;
    const values = parseCsvLine(rawLine);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });

    const fullName = (row["Full Name"] || "").trim();
    const firstName = (row["First Name"] || "").trim();
    const lastName = (row["Last Name"] || "").trim();
    const location = (row["Location (from Name)"] || "").trim();
    const csvAddress = (row["Address"] || "").trim();
    const phone1Raw = row["Phone 1"] || "";
    const phone2Raw = row["Phone 2"] || "";
    const phone3Raw = row["Phone 3"] || "";
    const emailRaw = (row["Email"] || "").trim();
    const orgRaw = (row["Organization"] || "").trim();

    const mainPhone = normalizePhone(phone1Raw);
    const altPhone = normalizePhone(phone2Raw || phone3Raw);

    if (!mainPhone) {
      skippedNoPhone++;
      continue;
    }

    // Determine name fields
    let finalFullName = fullName;
    if (!finalFullName) {
      finalFullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Customer";
    }
    const finalFirstName = firstName || finalFullName.split(/\s+/)[0] || "Customer";
    const finalLastName = lastName || finalFullName.split(/\s+/).slice(1).join(" ") || "";

    // Determine address fields
    const line1 = csvAddress || location || "N/A";
    const city = location || "Badnawar";
    const state = "Madhya Pradesh";
    const pincode = "454660";

    // Determine preferred language
    const prefLanguage = isHindiText(finalFullName) || isHindiText(location) ? "HINDI" : "ENGLISH";

    // Validate email
    const email = /^\S+@\S+\.\S+$/.test(emailRaw) ? emailRaw.toLowerCase() : undefined;

    // Notes
    const notesParts = [];
    if (orgRaw) notesParts.push(`Organization: ${orgRaw}`);
    if (phone2Raw && normalizePhone(phone2Raw) !== mainPhone) {
      notesParts.push(`Alt Phone: ${phone2Raw}`);
    }
    if (phone3Raw && normalizePhone(phone3Raw) !== mainPhone) {
      notesParts.push(`Other Phone: ${phone3Raw}`);
    }
    const notes = notesParts.join(" | ");

    const customerData = {
      full_name: finalFullName,
      first_name: finalFirstName,
      last_name: finalLastName,
      whatsapp_number: mainPhone,
      alternate_phone: altPhone || undefined,
      email: email,
      address: {
        line1: line1,
        city: city,
        state: state,
        pincode: pincode,
      },
      customer_type: "RETAIL",
      preferred_language: prefLanguage,
      notes: notes || undefined,
      shop_id: shopObjectId,
      deleted_at: null,
    };

    if (isDryRun) {
      insertedCount++;
      if (insertedCount <= 5) {
        console.log(`[DryRun #${insertedCount}]`, customerData);
      }
      continue;
    }

    try {
      // Find existing customer by shop_id and whatsapp_number
      const existing = await Customer.findOne({
        shop_id: shopObjectId,
        whatsapp_number: mainPhone,
        deleted_at: null,
      });

      if (existing) {
        // Update existing customer details
        await Customer.findByIdAndUpdate(existing._id, customerData);
        updatedCount++;
      } else {
        // Insert new customer
        await Customer.create(customerData);
        insertedCount++;
      }

      if ((insertedCount + updatedCount) % 500 === 0) {
        console.log(`⏳ Processed ${insertedCount + updatedCount} customers...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ Error importing "${finalFullName}" (${mainPhone}):`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("              IMPORT SUMMARY RESULTS              ");
  console.log("==================================================");
  console.log(`📊 Total CSV Rows Processed : ${totalRows}`);
  console.log(`✨ New Customers Created     : ${insertedCount}`);
  console.log(`🔄 Existing Customers Updated : ${updatedCount}`);
  console.log(`⚠️ Skipped (No Phone Number) : ${skippedNoPhone}`);
  console.log(`❌ Failed / Error Count     : ${errorCount}`);
  console.log("==================================================\n");

  if (!isDryRun) {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB.");
  }
}

runImport().catch((err) => {
  console.error("❌ Fatal Error running import:", err);
  process.exit(1);
});
