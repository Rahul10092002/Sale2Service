import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Customer from "../models/Customer.js";
import Dealer from "../models/Dealer.js";
import InventoryItem from "../models/InventoryItem.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import FestivalSchedule from "../models/FestivalSchedule.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

const MODEL_MAP = {
  invoices: {
    model: Invoice,
    label: "Invoice",
    getDisplayName: (item) => `Invoice #${item.invoice_number || item._id}`,
    getSubtitle: (item) => `Customer: ${item.customer_name || "N/A"} | Total: ₹${item.grand_total ?? item.total_amount ?? 0}`,
  },
  customers: {
    model: Customer,
    label: "Customer",
    getDisplayName: (item) => item.full_name || "Unnamed Customer",
    getSubtitle: (item) => `WhatsApp: ${item.whatsapp_number || "N/A"} | Email: ${item.email || "N/A"}`,
  },
  products: {
    model: InvoiceItem,
    label: "Product / Line Item",
    getDisplayName: (item) => item.product_name || "Unnamed Product",
    getSubtitle: (item) => `Serial: ${item.serial_number || "N/A"} | Price: ₹${item.unit_price || 0}`,
  },
  inventory: {
    model: InventoryItem,
    label: "Inventory Item",
    getDisplayName: (item) => item.product_name || "Inventory Item",
    getSubtitle: (item) => `Serial: ${item.serial_number || "N/A"} | Status: ${item.status || "N/A"}`,
  },
  dealers: {
    model: Dealer,
    label: "Supplier / Dealer",
    getDisplayName: (item) => item.name || "Unnamed Supplier",
    getSubtitle: (item) => `Phone: ${item.phone || "N/A"} | GSTIN: ${item.tax_id || "N/A"}`,
  },
  festivalSchedule: {
    model: FestivalSchedule,
    label: "Festival Schedule",
    getDisplayName: (item) => item.festival_name || "Festival Event",
    getSubtitle: (item) => `Scheduled: ${item.schedule_date ? new Date(item.schedule_date).toLocaleDateString("en-IN") : "N/A"}`,
  },
  users: {
    model: User,
    label: "User",
    getDisplayName: (item) => item.name || "User",
    getSubtitle: (item) => `Email: ${item.email || "N/A"} | Phone: ${item.phone || "N/A"}`,
  },
  roles: {
    model: Role,
    label: "Role",
    getDisplayName: (item) => item.name || "Role",
    getSubtitle: (item) => `Permissions: ${(item.permissions || []).length} assigned`,
  },
};

/**
 * Get soft-deleted items across all entities for current shop
 * GET /v1/recycle-bin
 */
export const getRecycleBinItems = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { entity_type = "all", search = "", page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 25), 100);

    const targetTypes =
      entity_type === "all" || !MODEL_MAP[entity_type]
        ? Object.keys(MODEL_MAP)
        : [entity_type];

    let allDeletedItems = [];

    for (const typeKey of targetTypes) {
      const config = MODEL_MAP[typeKey];
      if (!config) continue;

      const query = {
        shop_id: new mongoose.Types.ObjectId(shopId),
        deleted_at: { $ne: null },
      };

      const docs = await config.model
        .find(query)
        .lean()
        .exec();

      for (const doc of docs) {
        const displayName = config.getDisplayName(doc);
        const subtitle = config.getSubtitle(doc);

        // Filter search if provided
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const matchName = String(displayName).toLowerCase().includes(q);
          const matchSub = String(subtitle).toLowerCase().includes(q);
          if (!matchName && !matchSub) continue;
        }

        allDeletedItems.push({
          id: doc._id,
          entity_type: typeKey,
          entity_label: config.label,
          display_name: displayName,
          subtitle: subtitle,
          deleted_at: doc.deleted_at,
          created_at: doc.createdAt,
        });
      }
    }

    // Sort by deleted_at descending
    allDeletedItems.sort(
      (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    );

    const total = allDeletedItems.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = allDeletedItems.slice(startIndex, startIndex + limitNum);

    // Get counts per entity type for badge counters
    const counts = {};
    for (const key of Object.keys(MODEL_MAP)) {
      const cQuery = {
        shop_id: new mongoose.Types.ObjectId(shopId),
        deleted_at: { $ne: null },
      };
      counts[key] = await MODEL_MAP[key].model.countDocuments(cQuery);
    }
    counts.all = Object.values(counts).reduce((acc, val) => acc + val, 0);

    return res.json({
      success: true,
      data: {
        items: paginatedItems,
        counts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("getRecycleBinItems error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recycle bin items",
      error: error.message,
    });
  }
};

/**
 * Restore a soft-deleted item
 * PUT /v1/recycle-bin/restore
 */
export const restoreItem = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { entity_type, id } = req.body;

    if (!entity_type || !id || !MODEL_MAP[entity_type]) {
      return res.status(400).json({
        success: false,
        message: "Valid entity_type and id are required",
      });
    }

    const config = MODEL_MAP[entity_type];
    const item = await config.model.findOne({
      _id: id,
      shop_id: shopId,
      deleted_at: { $ne: null },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${config.label} not found in Recycle Bin`,
      });
    }

    item.deleted_at = null;
    await item.save();

    // If restoring an invoice, also restore child invoice items
    if (entity_type === "invoices") {
      await InvoiceItem.updateMany(
        { invoice_id: id, shop_id: shopId },
        { deleted_at: null }
      );
    }

    // If restoring an inventory item, also restore parent purchase order if soft-deleted
    if (entity_type === "inventory" && item.purchase_order_id) {
      await PurchaseOrder.findByIdAndUpdate(item.purchase_order_id, {
        deleted_at: null,
      });
    }

    return res.json({
      success: true,
      message: `${config.label} restored successfully`,
      data: { id, entity_type },
    });
  } catch (error) {
    console.error("restoreItem error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to restore item",
      error: error.message,
    });
  }
};

/**
 * Permanently delete a soft-deleted item
 * DELETE /v1/recycle-bin/permanent
 */
export const permanentlyDeleteItem = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { entity_type, id } = req.body;

    if (!entity_type || !id || !MODEL_MAP[entity_type]) {
      return res.status(400).json({
        success: false,
        message: "Valid entity_type and id are required",
      });
    }

    const config = MODEL_MAP[entity_type];
    const deletedDoc = await config.model.findOneAndDelete({
      _id: id,
      shop_id: shopId,
      deleted_at: { $ne: null },
    });

    if (!deletedDoc) {
      return res.status(404).json({
        success: false,
        message: `${config.label} not found in Recycle Bin`,
      });
    }

    // If permanently deleting an invoice, also delete child invoice items
    if (entity_type === "invoices") {
      await InvoiceItem.deleteMany({ invoice_id: id, shop_id: shopId });
    }

    return res.json({
      success: true,
      message: `${config.label} permanently deleted`,
      data: { id, entity_type },
    });
  } catch (error) {
    console.error("permanentlyDeleteItem error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete item",
      error: error.message,
    });
  }
};

/**
 * Empty the entire Recycle Bin or a specific entity category
 * DELETE /v1/recycle-bin/empty
 */
export const emptyRecycleBin = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { entity_type = "all" } = req.body || {};

    const targetTypes =
      entity_type === "all" || !MODEL_MAP[entity_type]
        ? Object.keys(MODEL_MAP)
        : [entity_type];

    let totalDeleted = 0;

    for (const typeKey of targetTypes) {
      const config = MODEL_MAP[typeKey];
      if (!config) continue;

      const result = await config.model.deleteMany({
        shop_id: shopId,
        deleted_at: { $ne: null },
      });

      totalDeleted += result.deletedCount || 0;
    }

    return res.json({
      success: true,
      message: `Recycle Bin cleared successfully (${totalDeleted} item(s) permanently purged)`,
      data: { totalDeleted },
    });
  } catch (error) {
    console.error("emptyRecycleBin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to empty recycle bin",
      error: error.message,
    });
  }
};
