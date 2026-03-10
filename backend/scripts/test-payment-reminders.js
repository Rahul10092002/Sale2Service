import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the backend/.env when running from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from backend/.env explicitly so MSG91 vars are available
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Dynamically import SchedulerService after env is loaded so MSG91 config is available
let SchedulerService;
try {
  const mod = await import("../scheduler/index.js");
  SchedulerService = mod.default;
} catch (e) {
  console.error("Failed to import SchedulerService:", e);
  process.exit(1);
}

// Ensure all Mongoose models are registered (models register themselves on import)
try {
  await Promise.all([
    import("../models/Customer.js"),
    import("../models/Invoice.js"),
    import("../models/InvoiceItem.js"),
    import("../models/MessageLog.js"),
    import("../models/ReminderLog.js"),
    import("../models/ReminderRule.js"),
    import("../models/ServicePlan.js"),
    import("../models/ServiceSchedule.js"),
    import("../models/ServiceVisit.js"),
    import("../models/Shop.js"),
    import("../models/User.js"),
    import("../models/WhatsAppTemplate.js"),
  ]);
} catch (e) {
  console.warn("Warning: failed to pre-import some models:", e);
}

async function main() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb+srv://rahul:rahul10092002@cluster0.alfq874.mongodb.net/?appName=Cluster0";

    console.log("Connecting to MongoDB at", mongoUri);
    // Use mongoose default connection options
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    const scheduler = new SchedulerService();

    console.log("Testing scheduler status...");
    const status = scheduler.getStatus();
    console.log("Scheduler status:", status);

    console.log("Running payment reminder test...");
    await scheduler.runManualTest("payment");

    console.log("Payment reminder test complete");
  } catch (err) {
    console.error("Error running payment reminder test:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

main();
