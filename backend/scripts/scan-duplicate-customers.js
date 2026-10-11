import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";

function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  let clean = String(rawPhone).replace(/[^\d]/g, "").trim();
  if (clean.startsWith("91") && clean.length === 12) {
    clean = clean.substring(2);
  } else if (clean.startsWith("0") && clean.length === 11) {
    clean = clean.substring(1);
  } else if (clean.length > 10 && clean.startsWith("91")) {
    clean = clean.slice(-10);
  }
  return clean;
}

async function scan() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Fetch all active customers
  const customers = await Customer.find({ deleted_at: null }).lean();
  console.log(`Total active customers in DB: ${customers.length}`);

  // Group by shop_id and normalized phone
  const phoneGroups = new Map();

  for (const c of customers) {
    const norm = normalizePhone(c.whatsapp_number);
    if (!norm || norm.length < 10) continue;

    const key = `${c.shop_id.toString()}:::${norm}`;
    if (!phoneGroups.has(key)) {
      phoneGroups.set(key, []);
    }
    phoneGroups.get(key).push(c);
  }

  const duplicatesByPhone = [];
  for (const [key, group] of phoneGroups.entries()) {
    if (group.length > 1) {
      duplicatesByPhone.push({
        key,
        normPhone: key.split(":::")[1],
        shopId: key.split(":::")[0],
        customers: group,
      });
    }
  }

  console.log(`\nFound ${duplicatesByPhone.length} duplicate phone group(s)!\n`);

  // For each duplicate group, inspect invoices
  const report = [];

  for (const dup of duplicatesByPhone) {
    const custIds = dup.customers.map((c) => c._id);
    const invoices = await Invoice.find({
      customer_id: { $in: custIds },
      deleted_at: null,
    }).lean();

    const invoiceMap = new Map();
    for (const inv of invoices) {
      const cIdStr = inv.customer_id.toString();
      if (!invoiceMap.has(cIdStr)) {
        invoiceMap.set(cIdStr, []);
      }
      invoiceMap.get(cIdStr).push(inv);
    }

    const groupDetails = {
      normalizedPhone: dup.normPhone,
      shopId: dup.shopId,
      customerCount: dup.customers.length,
      customers: dup.customers.map((c) => {
        const custInvoices = invoiceMap.get(c._id.toString()) || [];
        const totalInvoiced = custInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
        const totalPaid = custInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
        const totalDue = custInvoices.reduce((sum, i) => sum + (i.amount_due || 0), 0);

        return {
          _id: c._id.toString(),
          customer_id: c.customer_id,
          full_name: c.full_name,
          raw_phone: c.whatsapp_number,
          address: c.address ? `${c.address.line1 || ""}, ${c.address.city || ""}` : "N/A",
          createdAt: c.createdAt,
          invoiceCount: custInvoices.length,
          totalInvoiced,
          totalPaid,
          totalDue,
          invoices: custInvoices.map((inv) => ({
            _id: inv._id.toString(),
            invoice_number: inv.invoice_number,
            total_amount: inv.total_amount,
            amount_paid: inv.amount_paid,
            amount_due: inv.amount_due,
            status: inv.payment_status,
          })),
        };
      }),
    };

    report.push(groupDetails);
  }

  console.log("=== DUPLICATE REPORT JSON ===");
  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

scan().catch((err) => {
  console.error("Scan error:", err);
  process.exit(1);
});
