import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import ReminderLog from "../models/ReminderLog.js";

const MERGE_OPERATIONS = [
  {
    group: 1,
    phone: "9981561391",
    survivingId: "6aac18fc58073e356ac6650d",
    duplicateId: "6ac4cd7e8b819087bedccd80",
    updateFields: {
      full_name: "Umesh Herateja",
      whatsapp_number: "9981561391",
    },
  },
  {
    group: 2,
    phone: "9993963104",
    survivingId: "6aac46a49de680e005064eb3",
    duplicateId: "6ac4cd3d8b819087bedccbea",
    updateFields: {
      full_name: "Dasai Paras Patidar M. k",
      whatsapp_number: "9993963104",
    },
  },
  {
    group: 3,
    phone: "9993442057",
    survivingId: "6aad81639de680e005065aaa",
    duplicateId: "6ac4cd7f8b819087bedccd98",
    updateFields: {
      full_name: "Gordan Megaji",
      whatsapp_number: "9993442057",
    },
  },
  {
    group: 4,
    phone: "9754084111",
    survivingId: "6aafc58bf4178f6a5ea20baf",
    duplicateId: "6ac4d0df8b819087bedce656",
    updateFields: {
      full_name: "Abhishek Mandlecha",
      whatsapp_number: "9754084111",
    },
  },
  {
    group: 5,
    phone: "9893859079",
    survivingId: "6ab4f5efe05fbe6911d6098d",
    duplicateId: "6ac4d0f18b819087bedce726",
    updateFields: {
      full_name: "Takrva Delip",
      whatsapp_number: "9893859079",
    },
  },
  {
    group: 6,
    phone: "7869622792",
    survivingId: "6ab4f6b4e05fbe6911d60a24",
    duplicateId: "6ac4ce468b819087bedcd174",
    updateFields: {
      full_name: "Devendr bhimaji dasai",
      whatsapp_number: "7869622792",
    },
  },
  {
    group: 7,
    phone: "9981620866",
    survivingId: "6aca82a588051c118161c6e5",
    duplicateId: "6ab63992e05fbe6911d617c9",
    updateFields: {
      full_name: "Shree ram Patider (doleya)",
      whatsapp_number: "9981620866",
    },
  },
  {
    group: 8,
    phone: "9827725266",
    survivingId: "6abaa33ee05fbe6911d63106",
    duplicateId: "6ac4ce498b819087bedcd1a0",
    updateFields: {
      full_name: "Shivam patil",
      whatsapp_number: "9827725266",
    },
  },
  {
    group: 9,
    phone: "9993527876",
    survivingId: "6abfafa3e05fbe6911d648d8",
    duplicateId: "6ac4ccf38b819087bedcc9cc",
    updateFields: {
      full_name: "Dasai Manoj Bhalod",
      whatsapp_number: "9993527876",
    },
  },
  {
    group: 10,
    phone: "9755373103",
    survivingId: "6ac1d65de05fbe6911d64f5b",
    duplicateId: "6ac4d0c18b819087bedce50e",
    updateFields: {
      full_name: "Kamal Lembaje",
      whatsapp_number: "9755373103",
    },
  },
  {
    group: 11,
    phone: "9179929859",
    survivingId: "6ac1e457e05fbe6911d64f75",
    duplicateId: "6ac4d0c48b819087bedce532",
    updateFields: {
      full_name: "Manohar Patel",
      whatsapp_number: "9179929859",
    },
  },
  {
    group: 12,
    phone: "9993948399",
    survivingId: "6ac9277188051c118161c01c",
    duplicateId: "6ac4d03f8b819087bedce02e",
    updateFields: {
      full_name: "Sanjay Patider valashiva",
      whatsapp_number: "9993948399",
    },
  },
];

async function runBatchMerge() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for Batch Merge");

  const results = [];
  const now = new Date();

  for (const op of MERGE_OPERATIONS) {
    console.log(`\n--- Processing Group ${op.group} (${op.phone}) ---`);
    const survivingObjId = new mongoose.Types.ObjectId(op.survivingId);
    const duplicateObjId = new mongoose.Types.ObjectId(op.duplicateId);

    const survivingCust = await Customer.findById(survivingObjId);
    const duplicateCust = await Customer.findById(duplicateObjId);

    if (!survivingCust || !duplicateCust) {
      console.error(`❌ Missing record for group ${op.group}`);
      continue;
    }

    // 1. Soft Delete Duplicate Profile FIRST (so unique index frees up the phone number)
    await Customer.findByIdAndUpdate(duplicateObjId, {
      $set: {
        deleted_at: now,
        notes: `Merged into customer ${op.survivingId} on ${now.toISOString()}`,
      },
    });

    // 2. Relink Invoices
    const invoiceRes = await Invoice.updateMany(
      { customer_id: duplicateObjId },
      { $set: { customer_id: survivingObjId } }
    );

    // 3. Relink ReminderLogs
    const duplicateRefs = [
      op.duplicateId,
      duplicateCust.customer_id,
    ].filter(Boolean);

    await ReminderLog.updateMany(
      { entity_id: { $in: duplicateRefs }, entity_type: "CUSTOMER" },
      {
        $set: {
          entity_id: survivingCust.customer_id,
          recipient_name: op.updateFields.full_name || survivingCust.full_name,
          recipient_number: op.updateFields.whatsapp_number || survivingCust.whatsapp_number,
        },
      }
    );

    // 4. Update Surviving Profile
    if (op.updateFields.full_name) {
      survivingCust.full_name = op.updateFields.full_name;
      const parts = op.updateFields.full_name.trim().split(/\s+/);
      survivingCust.first_name = parts[0] || "";
      survivingCust.last_name = parts.slice(1).join(" ") || "";
    }
    if (op.updateFields.whatsapp_number) {
      survivingCust.whatsapp_number = op.updateFields.whatsapp_number;
    }
    survivingCust.deleted_at = null;
    await survivingCust.save();

    // 5. Count final invoices on surviving
    const finalInvoices = await Invoice.countDocuments({
      customer_id: survivingObjId,
      deleted_at: null,
    });

    console.log(`✅ Merged "${duplicateCust.full_name}" into "${survivingCust.full_name}"`);
    console.log(`   Invoices moved: ${invoiceRes.modifiedCount}, Total on surviving: ${finalInvoices}`);

    results.push({
      group: op.group,
      phone: op.phone,
      survivingId: op.survivingId,
      survivingName: survivingCust.full_name,
      duplicateId: op.duplicateId,
      duplicateName: duplicateCust.full_name,
      invoicesRelinked: invoiceRes.modifiedCount,
      totalInvoicesNow: finalInvoices,
    });
  }

  console.log("\n================ BATCH MERGE SUMMARY ================");
  console.table(results);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

runBatchMerge().catch((err) => {
  console.error("Batch merge error:", err);
  process.exit(1);
});
