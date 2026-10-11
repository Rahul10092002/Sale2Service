import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import FestivalSchedule from "../models/FestivalSchedule.js";
import WishesReminderScheduler from "../scheduler/reminders/WishesReminderScheduler.js";

async function main() {
  console.log("=== Resume / Repair Navratri Campaign ===");
  await mongoose.connect(process.env.MONGODB_URI);

  const scheduler = new WishesReminderScheduler();

  // Find Navratri festival
  const navratriFestivals = await FestivalSchedule.find({
    festival_name: { $regex: "नवरात्रि|navratri", $options: "i" },
    deleted_at: null,
  }).sort({ schedule_date: -1 });

  if (navratriFestivals.length === 0) {
    console.log("No Navratri festival schedule found.");
    await mongoose.disconnect();
    return;
  }

  for (const festival of navratriFestivals) {
    console.log(`\nFound Festival: ${festival.festival_name} (${festival._id})`);
    console.log(`- Shop ID: ${festival.shop_id}`);
    console.log(`- Status: ${festival.status}`);
    console.log(`- Wishes Sent so far: ${festival.festival_wishes_sent}`);

    const res = await scheduler.resetFailedFestivalWishLogs(festival._id);
    console.log(`✔ Repaired & Reset:`);
    console.log(`  • Valid sent customers retained: ${res.validSentCount}`);
    console.log(`  • Reset spam-failed records: ${res.resetCount}`);
    console.log(`  • Festival status set to 'Pending' so it will resume cleanly.`);
  }

  const isWithinWindow = scheduler.isWithinAllowedFestivalWindow();
  console.log(`\nCurrent IST time window status: ${isWithinWindow ? "ACTIVE (06:00 - 07:00 AM IST)" : "INACTIVE (outside 06:00 - 07:00 AM IST)"}`);

  if (process.argv.includes("--run-now")) {
    console.log("\n🚀 Flag --run-now detected. Starting anti-spam festival run with window override...");
    await scheduler.processFestivalWishes({ forceWindowOverride: true });
    console.log("Festival run finished.");
  } else {
    console.log("\nℹ The scheduler is now ready. It will automatically process remaining customers between 06:00 AM and 07:00 AM IST in small anti-spam batches of 10.");
    console.log("  To run it immediately right now, run: node backend/scripts/resume-navratri-campaign.js --run-now");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Error:", err);
  await mongoose.disconnect();
});
