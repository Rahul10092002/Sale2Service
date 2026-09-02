import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import InvoiceItem from "../models/InvoiceItem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/warranty_desk";
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);

  try {
    console.log("Setting item_type: 'PRODUCT' on all existing invoice items missing item_type...");
    const updateResult = await InvoiceItem.updateMany(
      { item_type: { $exists: false } },
      { $set: { item_type: "PRODUCT" } }
    );
    console.log(`Updated ${updateResult.modifiedCount} invoice items.`);

    console.log("Dropping legacy serial_number index if exists...");
    const collection = InvoiceItem.collection;
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find(
      (idx) => idx.name === "serial_number_1_shop_id_1_deleted_at_1"
    );

    if (legacyIndex) {
      await collection.dropIndex("serial_number_1_shop_id_1_deleted_at_1");
      console.log("Dropped legacy index 'serial_number_1_shop_id_1_deleted_at_1'.");
    }

    console.log("Syncing new partial index on InvoiceItem...");
    await InvoiceItem.syncIndexes();
    console.log("Indexes synced successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrate();
