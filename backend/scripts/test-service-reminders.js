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
    const forceResend = process.argv.includes("--force");
    const testPhone = process.argv.find(arg => arg.startsWith("--phone="))?.split("=")[1];

    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb+srv://rahul:rahul10092002@cluster0.alfq874.mongodb.net/?appName=Cluster0";

    console.log("Connecting to MongoDB at", mongoUri);
    // Use mongoose default connection options (modern drivers ignore deprecated flags)
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    const scheduler = new SchedulerService();

    if (testPhone) {
      console.log(`Running direct message test for updated variables to ${testPhone}...`);
      
      // Updated variables matched from ServiceReminderScheduler.js
      const getServiceCountHindi = (n) => {
        const map = ["पहली", "दूसरी", "तीसरी", "चौथी", "पांचवीं"];
        return map[n - 1] || `${n}वीं`;
      };
      
      const testVariables = {
        1: "Rahul (Test Customer)", // {{1}} Customer Name
        2: "Test Product",          // {{2}} Product Name
        3: "SN-987654321",          // {{3}} Serial Number (Added)
        4: getServiceCountHindi(2), // {{4}} Service Count in Hindi
        5: "9876543210",            // {{5}} Shop Contact
        6: "Rajdeep Power Point"    // {{6}} Shop Name
      };

      console.log("Testing with variables:", testVariables);
      await scheduler.testMessage(testPhone, "service_reminder", testVariables, [testVariables[5]]);
      console.log("Direct message test complete.");
    } else {
      // Test different reminder types
      console.log("Testing scheduler status...");
      const status = scheduler.getStatus();
      console.log("Scheduler status:", status);

      console.log("Running service reminder test...");
      await scheduler.runManualTest("service", forceResend);

      console.log("Running warranty reminder test...");
      await scheduler.runManualTest("warranty");

      console.log("Running payment reminder test...");
      await scheduler.runManualTest("payment");

      console.log("All reminder tests complete");
      console.log("\n💡 Tip: To test just a single message with the updated variables, run:");
      console.log("node backend/scripts/test-service-reminders.js --phone=YOURNUMBER");
    }

  } catch (err) {
    console.error("Error running reminder test:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

main();
