import mongoose from "mongoose";
import dotenv from "dotenv";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServiceVisit from "../models/ServiceVisit.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Migration script to backfill shop_id on all historical ServiceSchedule
 * and ServiceVisit records where shop_id is missing or null.
 */
async function runBackfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in environment.");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB.");

  try {
    // 1. Check & Backfill ServiceSchedules in bulk
    const schedulesWithoutShop = await ServiceSchedule.find({
      $or: [{ shop_id: { $exists: false } }, { shop_id: null }],
    }).select("_id service_plan_id");

    console.log(`\n📋 Found ${schedulesWithoutShop.length} ServiceSchedules with missing shop_id.`);

    if (schedulesWithoutShop.length > 0) {
      const planIds = [...new Set(schedulesWithoutShop.map((s) => s.service_plan_id).filter(Boolean))];
      const plans = await ServicePlan.find({ _id: { $in: planIds } }).select("_id shop_id");
      const planShopMap = new Map(plans.map((p) => [String(p._id), p.shop_id]));

      const scheduleBulkOps = [];
      for (const schedule of schedulesWithoutShop) {
        const shopId = planShopMap.get(String(schedule.service_plan_id));
        if (shopId) {
          scheduleBulkOps.push({
            updateOne: {
              filter: { _id: schedule._id },
              update: { $set: { shop_id: shopId } },
            },
          });
        }
      }

      if (scheduleBulkOps.length > 0) {
        const res = await ServiceSchedule.bulkWrite(scheduleBulkOps);
        console.log(`✅ Successfully backfilled ${res.modifiedCount} ServiceSchedules in bulk.`);
      }
    }

    // 2. Check & Backfill ServiceVisits in bulk
    const visitsWithoutShop = await ServiceVisit.find({
      $or: [{ shop_id: { $exists: false } }, { shop_id: null }],
    }).select("_id service_schedule_id");

    console.log(`\n📋 Found ${visitsWithoutShop.length} ServiceVisits with missing shop_id.`);

    if (visitsWithoutShop.length > 0) {
      const scheduleIds = [...new Set(visitsWithoutShop.map((v) => v.service_schedule_id).filter(Boolean))];
      const schedules = await ServiceSchedule.find({ _id: { $in: scheduleIds } }).select("_id shop_id service_plan_id");
      const scheduleMap = new Map(schedules.map((s) => [String(s._id), s]));

      // For any schedule that still lacks shop_id, fetch its plan
      const missingPlanIds = schedules.filter((s) => !s.shop_id && s.service_plan_id).map((s) => s.service_plan_id);
      let planShopMap = new Map();
      if (missingPlanIds.length > 0) {
        const plans = await ServicePlan.find({ _id: { $in: missingPlanIds } }).select("_id shop_id");
        planShopMap = new Map(plans.map((p) => [String(p._id), p.shop_id]));
      }

      const visitBulkOps = [];
      for (const visit of visitsWithoutShop) {
        const schedule = scheduleMap.get(String(visit.service_schedule_id));
        let shopId = schedule?.shop_id || (schedule?.service_plan_id ? planShopMap.get(String(schedule.service_plan_id)) : null);

        if (shopId) {
          visitBulkOps.push({
            updateOne: {
              filter: { _id: visit._id },
              update: { $set: { shop_id: shopId } },
            },
          });
        }
      }

      if (visitBulkOps.length > 0) {
        const res = await ServiceVisit.bulkWrite(visitBulkOps);
        console.log(`✅ Successfully backfilled ${res.modifiedCount} ServiceVisits in bulk.`);
      }
    }

    // 3. Verification check
    const remainingUnscopedSchedules = await ServiceSchedule.countDocuments({
      $or: [{ shop_id: { $exists: false } }, { shop_id: null }],
    });
    const remainingUnscopedVisits = await ServiceVisit.countDocuments({
      $or: [{ shop_id: { $exists: false } }, { shop_id: null }],
    });

    console.log(`\n🔍 Verification Status:`);
    console.log(`   - Unscoped ServiceSchedules remaining: ${remainingUnscopedSchedules}`);
    console.log(`   - Unscoped ServiceVisits remaining: ${remainingUnscopedVisits}`);

    if (remainingUnscopedSchedules === 0 && remainingUnscopedVisits === 0) {
      console.log(`\n🎉 Backfill completed cleanly with 100% tenant scoping!`);
    } else {
      console.warn(`\n⚠️ Warning: Some orphaned records without parent plans/schedules could not be automatically backfilled.`);
    }
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

runBackfill();
