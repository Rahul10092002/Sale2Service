import InventoryItem from "../models/InventoryItem.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import ProductMaster from "../models/ProductMaster.js";
import Dealer from "../models/Dealer.js";
import InventoryAuditLog from "../models/InventoryAuditLog.js";
import {
  createReceivingSlipIntakeService,
  linkRetroactiveDealerService,
  reconcileInventoryStatusService,
} from "../services/inventoryService.js";

/**
 * Handle Multi-Row Receiving Slip Purchase Intake
 */
export const createReceivingSlipIntake = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const { dealer_id, dealer_invoice_no, purchase_date, purchase_bill_image, notes, items } = req.body;

    if (!dealer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dealer and at least one purchase item are required",
      });
    }

    const result = await createReceivingSlipIntakeService({
      shopId,
      userId,
      dealerId: dealer_id,
      dealerInvoiceNo: dealer_invoice_no,
      purchaseDate: purchase_date,
      purchaseBillImage: purchase_bill_image,
      notes,
      items,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating receiving slip intake:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process receiving slip",
    });
  }
};

/**
 * Get Paginated List of Inventory Items for Shop
 */
export const getInventoryItems = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { page = 1, limit = 20, search = "", status, dealer_id, product_id } = req.query;

    const query = { shop_id: shopId, deleted_at: null };

    if (status) query.status = status;
    if (dealer_id) query.dealer_id = dealer_id;
    if (product_id) query.product_id = product_id;

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { serial_number: searchRegex },
        { product_name: searchRegex },
        { purchase_invoice_ref: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      InventoryItem.find(query)
        .populate("product_id", "product_name category company model_number require_serial_tracking")
        .populate("dealer_id", "name contact_person phone email tax_id deleted_at")
        .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      InventoryItem.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory items",
      error: error.message,
    });
  }
};

/**
 * Handle Retroactive Post-Sale Dealer Linking
 */
export const linkRetroactiveDealer = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { dealer_id, serial_number, purchase_date, purchase_invoice_ref, notes } = req.body;

    const result = await linkRetroactiveDealerService({
      shopId,
      userId,
      itemId,
      dealerId: dealer_id,
      serialNumber: serial_number,
      purchaseDate: purchase_date,
      purchaseInvoiceRef: purchase_invoice_ref,
      notes,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error linking retroactive dealer:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to link dealer",
    });
  }
};

/**
 * Update Inventory Item Status (with Stock Reconciliation)
 */
export const updateInventoryStatus = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "New status is required",
      });
    }

    const result = await reconcileInventoryStatusService({
      shopId,
      userId,
      itemId,
      newStatus: status,
      notes,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating inventory status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update status",
    });
  }
};

/**
 * Get Audit Logs for an Inventory Item
 */
export const getItemAuditLogs = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { itemId } = req.params;

    const logs = await InventoryAuditLog.find({
      shop_id: shopId,
      inventory_item_id: itemId,
    })
      .populate("user_id", "first_name last_name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};
