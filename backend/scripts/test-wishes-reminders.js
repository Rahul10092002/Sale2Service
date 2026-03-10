import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the backend/.env when running from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from backend/.env explicitly so MSG91 vars are available
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import WishesReminderScheduler from "../scheduler/reminders/WishesReminderScheduler.js";

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://rahul:rahul10092002@cluster0.alfq874.mongodb.net/?appName=Cluster",
);

// Import all models to prevent MissingSchemaError
import Customer from "../models/Customer.js";
import MessageLog from "../models/MessageLog.js";
import ReminderLog from "../models/ReminderLog.js";
import ReminderRule from "../models/ReminderRule.js";
import WhatsAppTemplate from "../models/WhatsAppTemplate.js";

/**
 * Test script for wishes reminders (birthday and anniversary)
 */
async function testWishesReminders() {
  console.log("Testing Wishes Reminder Scheduler...");
  console.log("=====================================");

  const wishesScheduler = new WishesReminderScheduler();

  try {
    // Test 1: Check for customers with birthdays today
    console.log("\n1. Checking for birthday customers today...");
    await wishesScheduler.processBirthdayWishes();

    // Test 2: Check for customers with anniversaries today
    console.log("\n2. Checking for anniversary customers today...");
    await wishesScheduler.processAnniversaryWishes();

    // Test 3: Process all wishes reminders
    console.log("\n3. Processing all wishes reminders...");
    await wishesScheduler.processWishesReminders();

    console.log("\n✅ All wishes reminder tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDatabase connection closed");
  }
}

// Test specific date scenarios
async function testSpecificDates() {
  console.log("\nTesting specific date scenarios...");
  console.log("====================================");

  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    // Query customers with birthdays today
    const birthdayCustomers = await Customer.find({
      date_of_birth: {
        $exists: true,
        $ne: null,
      },
      deleted_at: null,
    });

    // Filter birthday customers
    const todayBirthdays = birthdayCustomers.filter((customer) => {
      const dob = new Date(customer.date_of_birth);
      return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
    });

    console.log(
      `Found ${todayBirthdays.length} customers with birthdays today (${todayMonth}/${todayDate})`,
    );
    todayBirthdays.forEach((customer) => {
      const dob = new Date(customer.date_of_birth);
      console.log(`- ${customer.full_name} (DOB: ${dob.toLocaleDateString()})`);
    });

    // Query customers with anniversaries today
    const anniversaryCustomers = await Customer.find({
      anniversary_date: {
        $exists: true,
        $ne: null,
      },
      deleted_at: null,
    });

    // Filter anniversary customers
    const todayAnniversaries = anniversaryCustomers.filter((customer) => {
      const anniversaryDate = new Date(customer.anniversary_date);
      return (
        anniversaryDate.getMonth() + 1 === todayMonth &&
        anniversaryDate.getDate() === todayDate
      );
    });

    console.log(
      `Found ${todayAnniversaries.length} customers with anniversaries today (${todayMonth}/${todayDate})`,
    );
    todayAnniversaries.forEach((customer) => {
      const anniversary = new Date(customer.anniversary_date);
      console.log(
        `- ${customer.full_name} (Anniversary: ${anniversary.toLocaleDateString()})`,
      );
    });
  } catch (error) {
    console.error("Error in specific date tests:", error);
  }
}

// Main execution
(async () => {
  try {
    await testSpecificDates();
    await testWishesReminders();
  } catch (error) {
    console.error("Main test script failed:", error);
  }
})();
