import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServiceVisit from "../models/ServiceVisit.js";
import { InvoiceSequenceService } from "../services/invoiceSequenceService.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Automated Verification Test Suite
 * Tests:
 * 1. Multi-Tenant Data Isolation
 * 2. Aggregation Pipeline Explain / Index Execution Stats (IXSCAN vs COLLSCAN)
 * 3. Atomic Sequence Generation under Concurrency
 * 4. Model Pre-Save Hooks for Automatic shop_id Propagation
 */
async function runVerificationSuite() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found.");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB for verification...");
  await mongoose.connect(uri);
  console.log("✅ Connected.\n");

  const shopA = new mongoose.Types.ObjectId();
  const shopB = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  try {
    console.log("🧪 --- TEST SUITE 1: Multi-Tenant Data Isolation ---");

    // Seed test customers for Shop A and Shop B
    const custA = await Customer.create({
      shop_id: shopA,
      full_name: "Tenant A Customer",
      whatsapp_number: "919999990001",
      address: {
        line1: "123 Market St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
    });

    const custB = await Customer.create({
      shop_id: shopB,
      full_name: "Tenant B Customer",
      whatsapp_number: "919999990002",
      address: {
        line1: "456 Park Ave",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
    });

    // Query Shop A customers via Aggregation Pipeline
    const shopAResult = await Customer.aggregate([
      { $match: { shop_id: shopA, deleted_at: null } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          customers: [{ $limit: 10 }],
        },
      },
    ]);

    const shopACustomers = shopAResult[0]?.customers || [];
    const hasLeakage = shopACustomers.some((c) => String(c._id) === String(custB._id));
    assert(!hasLeakage, "Shop A query never returns Shop B customer records");
    assert(shopACustomers.some((c) => String(c._id) === String(custA._id)), "Shop A query returns Shop A customer records");

    console.log("\n🧪 --- TEST SUITE 2: Explain Stats & Index Verification (IXSCAN) ---");

    // Explain customer query
    const custExplain = await Customer.find({
      shop_id: shopA,
      deleted_at: null,
    }).sort({ createdAt: -1 }).explain("executionStats");

    const winningStage = custExplain.queryPlanner?.winningPlan?.inputStage?.stage ||
                         custExplain.queryPlanner?.winningPlan?.stage;
    const isIndexUsed = JSON.stringify(custExplain).includes("IXSCAN");
    assert(isIndexUsed, `Customer query uses IXSCAN (detected index scan in query planner)`);

    console.log("\n🧪 --- TEST SUITE 3: Concurrent Sequence Generation (Atomicity) ---");

    const datePart = "20260914";
    const concurrentRequests = 10;
    const sequencePromises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      sequencePromises.push(InvoiceSequenceService.getNextInvoiceSequence(shopA, datePart));
    }

    const generatedSequences = await Promise.all(sequencePromises);
    const uniqueSequences = new Set(generatedSequences);

    assert(
      uniqueSequences.size === concurrentRequests,
      `Generated ${concurrentRequests} distinct sequences under concurrent execution with 0 collisions: [${generatedSequences.join(", ")}]`
    );

    console.log("\n🧪 --- TEST SUITE 4: Pre-Save Hook Automatic shop_id Propagation ---");

    // Create a ServicePlan for Shop A
    const dummyInvoiceItem = new mongoose.Types.ObjectId();
    const servicePlan = await ServicePlan.create({
      shop_id: shopA,
      invoice_item_id: dummyInvoiceItem,
      plan_name: "1 Year AMC",
      total_services: 4,
      service_interval_type: "QUARTERLY",
      service_interval_value: 3,
      service_start_date: new Date(),
      service_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Create a ServiceSchedule WITHOUT explicit shop_id
    const schedule = new ServiceSchedule({
      service_plan_id: servicePlan._id,
      scheduled_date: new Date(),
      service_number: 1,
      original_date: new Date(),
    });

    await schedule.save();
    assert(
      String(schedule.shop_id) === String(shopA),
      "ServiceSchedule pre-save hook successfully populated shop_id from parent ServicePlan"
    );

    // Create a ServiceVisit WITHOUT explicit shop_id
    const visit = new ServiceVisit({
      service_schedule_id: schedule._id,
      visit_date: new Date(),
      service_type: "FREE",
      technician_name: "Rajesh Kumar",
      created_by: testUserId,
    });

    await visit.save();
    assert(
      String(visit.shop_id) === String(shopA),
      "ServiceVisit pre-save hook successfully populated shop_id from parent ServiceSchedule"
    );

    // Clean up test records
    await Customer.deleteMany({ _id: { $in: [custA._id, custB._id] } });
    await ServicePlan.deleteOne({ _id: servicePlan._id });
    await ServiceSchedule.deleteOne({ _id: schedule._id });
    await ServiceVisit.deleteOne({ _id: visit._id });

  } catch (error) {
    console.error("❌ Verification Suite Execution Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n==========================================");
    console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("==========================================");
  }
}

runVerificationSuite();
