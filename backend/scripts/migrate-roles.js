import mongoose from "mongoose";
import dotenv from "dotenv";
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { MongoDb } from "../config/mongoose.js";

dotenv.config({ path: "backend/.env" });

const migrate = async () => {
  try {
    await MongoDb();
    console.log("Connected to MongoDB");

    const shops = await Shop.find({ deleted_at: null });
    console.log(`Found ${shops.length} shops to migrate`);

    for (const shop of shops) {
      console.log(`Processing shop: ${shop.shop_name} (${shop._id})`);

      // 1. Create default roles for this shop if they don't exist
      const defaultRoles = [
        { 
          name: "OWNER", 
          permissions: ["all"], 
          isDefault: true 
        },
        { 
          name: "ADMIN", 
          permissions: [
            "dashboard_view",
            "invoices_view", "invoices_create", "invoices_edit",
            "customers_view", "customers_create", "customers_edit",
            "products_view", "products_create", "products_edit",
            "inventory_view", "inventory_create", "inventory_edit", "inventory_delete",
            "users_view", "roles_view",
            "logs_view", "schedules_view", "settings_view"
          ], 
          isDefault: true 
        },
        { 
          name: "STAFF", 
          permissions: [
            "dashboard_view",
            "invoices_view", "invoices_create",
            "customers_view", "customers_create",
            "products_view",
            "inventory_view", "inventory_create",
            "schedules_view"
          ], 
          isDefault: true 
        },
      ];

      const roleMap = {};

      for (const dr of defaultRoles) {
        let role = await Role.findOne({ shop_id: shop._id, name: { $regex: new RegExp(`^${dr.name}$`, "i") }, deleted_at: null });
        if (!role) {
          role = new Role({
            ...dr,
            shop_id: shop._id,
          });
          await role.save();
          console.log(`  Created role: ${dr.name}`);
        } else {
          // Update existing default roles with current permission sets
          role.permissions = dr.permissions;
          role.name = dr.name; // Standardize to uppercase
          await role.save();
          console.log(`  Updated existing role: ${dr.name}`);
        }
        roleMap[dr.name] = role._id;
      }

      // 2. Find all users in this shop and update their role if it's a string
      const users = await User.find({ shop_id: shop._id, deleted_at: null });
      for (const user of users) {
        // If role is a string (legacy) or not in the new role system
        if (typeof user.role === "string" || !mongoose.Types.ObjectId.isValid(user.role)) {
          const legacyRole = String(user.role).toUpperCase();
          const newRoleId = roleMap[legacyRole] || roleMap["STAFF"];
          
          user.role = newRoleId;
          await user.save();
          console.log(`    Updated user: ${user.email} (${legacyRole} -> ${newRoleId})`);
        }
      }
    }

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
