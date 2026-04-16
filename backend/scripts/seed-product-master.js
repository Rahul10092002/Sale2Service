import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ProductMaster from "../models/ProductMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SHOP_ID = new mongoose.Types.ObjectId("696f000487f0258e94f1ee1b");

// 🔥 Brand + Models
const brands = {
  BATTERY: ["Amaron", "Exide", "Luminous", "SF Sonic"],
  INVERTER: ["Luminous", "Microtek", "V-Guard"],
  UPS: ["Microtek", "APC", "Luminous"],
  SOLAR_PANEL: ["Loom Solar", "Tata Power Solar"],
  CHARGER: ["Generic", "Amaron"],
  ACCESSORIES: ["Generic"],
};

const capacities = ["100Ah", "120Ah", "150Ah", "180Ah", "200Ah"];
const inverterVA = ["700VA", "900VA", "1100VA", "1450VA", "2000VA"];
const solarW = ["100W", "200W", "300W", "500W"];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateProducts(count = 500) {
  const products = [];
  const seenNames = new Set();

  for (let i = 0; i < count; i++) {
    const categoryKeys = Object.keys(brands);
    const category = random(categoryKeys);
    const company = random(brands[category]);

    let product = {
      product_category: category,
      company,
      shop_id: SHOP_ID,
      auto_saved: false,
      stock_quantity: randomPrice(5, 100),
      min_stock_alert: 10,
    };

    let nameBase = "";

    // 🔋 BATTERY
    if (category === "BATTERY") {
      const type = Math.random() > 0.5 ? "INVERTER_BATTERY" : "VEHICLE_BATTERY";
      nameBase = `${company} ${random(capacities)} Battery`;
      product = {
        ...product,
        battery_type: type,
        model_number: `${company.slice(0, 2).toUpperCase()}-${randomPrice(100, 999)}`,
        capacity_rating: random(capacities),
        voltage: "12V",
        selling_price: randomPrice(9000, 20000),
        cost_price: randomPrice(7000, 15000),
        warranty_type: "STANDARD",
        warranty_duration_months: random([12, 24, 36, 48]),
      };
    }
    // ⚡ INVERTER
    else if (category === "INVERTER") {
      const va = random(inverterVA);
      nameBase = `${company} ${va} Inverter`;
      product = {
        ...product,
        model_number: `INV-${randomPrice(100, 999)}`,
        capacity_rating: va,
        voltage: "12V",
        selling_price: randomPrice(5000, 12000),
        cost_price: randomPrice(4000, 9000),
        warranty_type: "PRO",
        warranty_duration_months: 24,
      };
    }
    // 🔌 UPS
    else if (category === "UPS") {
      const va = random(inverterVA);
      nameBase = `${company} ${va} UPS`;
      product = {
        ...product,
        model_number: `UPS-${randomPrice(100, 999)}`,
        capacity_rating: va,
        voltage: "12V",
        selling_price: randomPrice(3000, 8000),
        cost_price: randomPrice(2500, 6000),
        warranty_type: "STANDARD",
        warranty_duration_months: 12,
      };
    }
    // ☀️ SOLAR
    else if (category === "SOLAR_PANEL") {
      const w = random(solarW);
      nameBase = `${company} ${w} Solar Panel`;
      product = {
        ...product,
        model_number: `SOL-${randomPrice(100, 999)}`,
        capacity_rating: w,
        voltage: "24V",
        selling_price: randomPrice(5000, 20000),
        cost_price: randomPrice(4000, 15000),
        warranty_type: "EXTENDED",
        warranty_duration_months: 120,
      };
    }
    // 🔌 CHARGER
    else if (category === "CHARGER") {
      const cap = random(["10A", "15A", "20A"]);
      nameBase = `${company} Battery Charger ${cap}`;
      product = {
        ...product,
        model_number: `CHR-${randomPrice(100, 999)}`,
        capacity_rating: cap,
        voltage: "12V",
        selling_price: randomPrice(1500, 4000),
        cost_price: randomPrice(1000, 3000),
        warranty_type: "LIMITED",
        warranty_duration_months: 6,
      };
    }
    // 🧰 ACCESSORIES
    else {
      nameBase = random([
        "Battery Trolley",
        "Battery Cable Set",
        "Distilled Water Bottle",
        "Battery Terminal Set",
      ]);
      product = {
        ...product,
        model_number: `ACC-${randomPrice(100, 999)}`,
        selling_price: randomPrice(100, 2000),
        cost_price: randomPrice(50, 1500),
        warranty_type: "NONE",
        warranty_duration_months: 0,
      };
    }

    // Ensure Unique Product Name per Shop for the 500 items
    // Since unique constraint is (product_name, shop_id)
    let finalName = nameBase;
    let suffix = 1;
    while (seenNames.has(finalName.toLowerCase())) {
        finalName = `${nameBase} ${suffix++}`;
    }
    seenNames.add(finalName.toLowerCase());
    product.product_name = finalName;

    products.push(product);
  }

  return products;
}

async function seed() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb+srv://rahul:rahul10092002@cluster0.alfq874.mongodb.net/?appName=Cluster0";

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Clear existing products for this shop first to avoid mixed data
    console.log(`Cleaning up existing products for Shop: ${SHOP_ID}...`);
    await ProductMaster.deleteMany({ shop_id: SHOP_ID });

    console.log("Generating 500 products...");
    const data = generateProducts(500);

    console.log("Inserting data into database...");
    await ProductMaster.insertMany(data);

    console.log("✅ 500 inventory products seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

seed();
