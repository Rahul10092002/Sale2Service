import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Dealer from "../models/Dealer.js";
import InventoryAuditLog from "../models/InventoryAuditLog.js";
import {
  createReceivingSlipIntakeService,
  updateReceivingSlipService,
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
    const { dealer_id, dealer_invoice_no, purchase_date, purchase_bill_image, purchase_bill_images, notes, items } = req.body;

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
      purchaseBillImages: purchase_bill_images,
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
 * Get Single Inventory Item Details with All Related Information
 * (Includes linked receiving slip metadata, bill image, and all sibling items from the same slip)
 */
export const getInventoryItemById = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID format",
      });
    }

    let item = await InventoryItem.findOne({
      _id: itemId,
      shop_id: shopId,
      deleted_at: null,
    })
      .populate("product_id")
      .populate("dealer_id")
      .populate("purchase_order_id")
      .populate({
        path: "invoice_id",
        populate: { path: "customer_id" },
      })
      .populate("invoice_item_id");

    if (!item) {
      // Fallback: If itemId is a PurchaseOrder ID, locate the first active InventoryItem under this PurchaseOrder
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: itemId,
        shop_id: shopId,
        deleted_at: null,
      });

      if (purchaseOrder) {
        const firstActiveItem = await InventoryItem.findOne({
          shop_id: shopId,
          purchase_order_id: purchaseOrder._id,
          deleted_at: null,
        })
          .populate("product_id")
          .populate("dealer_id")
          .populate("purchase_order_id")
          .populate({
            path: "invoice_id",
            populate: { path: "customer_id" },
          })
          .populate("invoice_item_id");

        if (firstActiveItem) {
          item = firstActiveItem;
        }
      }
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found or has been deleted",
      });
    }

    // Fetch audit logs for this item
    const auditLogs = await InventoryAuditLog.find({
      shop_id: shopId,
      inventory_item_id: itemId,
    })
      .populate("user_id", "first_name last_name email")
      .sort({ createdAt: -1 });

    // Fetch Linked Receiving Slip & Sibling Items from the same slip
    let receivingSlip = null;
    let siblingItems = [];

    let purchaseOrder = null;
    if (item.purchase_order_id) {
      purchaseOrder = await PurchaseOrder.findOne({
        _id: item.purchase_order_id._id || item.purchase_order_id,
        shop_id: shopId,
        deleted_at: null,
      })
        .populate("dealer_id")
        .populate("created_by", "first_name last_name email");
    } else if (item.purchase_invoice_ref && item.purchase_invoice_ref.trim()) {
      purchaseOrder = await PurchaseOrder.findOne({
        dealer_invoice_no: item.purchase_invoice_ref.trim().toUpperCase(),
        shop_id: shopId,
        deleted_at: null,
      })
        .populate("dealer_id")
        .populate("created_by", "first_name last_name email");
    }

    if (purchaseOrder) {
      siblingItems = await InventoryItem.find({
        shop_id: shopId,
        purchase_order_id: purchaseOrder._id,
        deleted_at: null,
      })
        .populate("product_id")
        .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
        .sort({ createdAt: 1 });
    } else if (item.purchase_invoice_ref && item.purchase_invoice_ref.trim()) {
      siblingItems = await InventoryItem.find({
        shop_id: shopId,
        purchase_invoice_ref: item.purchase_invoice_ref.trim().toUpperCase(),
        deleted_at: null,
      })
        .populate("product_id")
        .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
        .sort({ createdAt: 1 });
    }

    if (purchaseOrder || siblingItems.length > 0) {
      // Structure and group items by product for multi-row view
      const productGroups = {};
      let totalItems = 0;
      let totalCost = 0;

      siblingItems.forEach((sItem) => {
        const prodId = sItem.product_id?._id?.toString() || sItem.product_name;
        if (!productGroups[prodId]) {
          productGroups[prodId] = {
            product_id: sItem.product_id?._id,
            product_name: sItem.product_name || sItem.product_id?.product_name || "Unknown Product",
            category:
              sItem.product_id?.product_category ||
              sItem.product_id?.category ||
              "OTHER",
            company: sItem.product_id?.company || "",
            model_number: sItem.product_id?.model_number || "",
            purchase_price: sItem.purchase_price || 0,
            quantity: 0,
            subtotal: 0,
            units: [],
          };
        }
        productGroups[prodId].quantity += 1;
        productGroups[prodId].subtotal += sItem.purchase_price || 0;
        totalItems += 1;
        totalCost += sItem.purchase_price || 0;

        productGroups[prodId].units.push({
          _id: sItem._id,
          serial_number: sItem.serial_number || "N/A",
          status: sItem.status,
          purchase_price: sItem.purchase_price,
          invoice_id: sItem.invoice_id,
          sold_at: sItem.sold_at,
          created_at: sItem.createdAt,
          isCurrentItem: sItem._id.toString() === item._id.toString(),
        });
      });

      receivingSlip = {
        slip: purchaseOrder
          ? {
              _id: purchaseOrder._id,
              dealer_invoice_no: purchaseOrder.dealer_invoice_no,
              purchase_date: purchaseOrder.purchase_date,
              dealer: purchaseOrder.dealer_id || item.dealer_id,
              total_items_count: purchaseOrder.total_items_count || totalItems,
              total_cost: purchaseOrder.total_cost || totalCost,
              notes: purchaseOrder.notes,
              purchase_bill_image: purchaseOrder.purchase_bill_image || item.purchase_bill_image || "",
              purchase_bill_images:
                purchaseOrder.purchase_bill_images?.length > 0
                  ? purchaseOrder.purchase_bill_images
                  : item.purchase_bill_images?.length > 0
                  ? item.purchase_bill_images
                  : [purchaseOrder.purchase_bill_image || item.purchase_bill_image].filter(Boolean),
              created_by: purchaseOrder.created_by,
              createdAt: purchaseOrder.createdAt,
            }
          : {
              _id: null,
              dealer_invoice_no: item.purchase_invoice_ref,
              purchase_date: item.purchase_date || item.createdAt,
              dealer: item.dealer_id || null,
              total_items_count: totalItems,
              total_cost: totalCost,
              notes: "",
              purchase_bill_image: item.purchase_bill_image || "",
              purchase_bill_images: item.purchase_bill_images?.length > 0 ? item.purchase_bill_images : [item.purchase_bill_image].filter(Boolean),
              created_by: null,
              createdAt: item.createdAt,
            },
        rows: Object.values(productGroups),
        totalUnits: totalItems,
        totalCost,
        siblingItemsCount: siblingItems.length,
      };
    }

    return res.status(200).json({
      success: true,
      item,
      auditLogs,
      receivingSlip,
    });
  } catch (error) {
    console.error("Error fetching inventory item details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory item details",
      error: error.message,
    });
  }
};

/**
 * Get Complete Receiving Slip Details (Multi-Product)
 */
export const getReceivingSlipById = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { id } = req.params;

    let purchaseOrder = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      purchaseOrder = await PurchaseOrder.findOne({
        _id: id,
        shop_id: shopId,
        deleted_at: null,
      })
        .populate("dealer_id")
        .populate("created_by", "first_name last_name email");
    }

    if (!purchaseOrder) {
      // Try searching by dealer_invoice_no
      purchaseOrder = await PurchaseOrder.findOne({
        dealer_invoice_no: id.trim().toUpperCase(),
        shop_id: shopId,
        deleted_at: null,
      })
        .populate("dealer_id")
        .populate("created_by", "first_name last_name email");
    }

    let items = [];

    if (purchaseOrder) {
      items = await InventoryItem.find({
        shop_id: shopId,
        purchase_order_id: purchaseOrder._id,
        deleted_at: null,
      })
        .populate("product_id")
        .populate("dealer_id")
        .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
        .sort({ createdAt: 1 });
    } else {
      // If no PO object found (e.g. legacy items or grouped by purchase_invoice_ref), search InventoryItem records by invoice ref
      items = await InventoryItem.find({
        shop_id: shopId,
        purchase_invoice_ref: id.trim().toUpperCase(),
        deleted_at: null,
      })
        .populate("product_id")
        .populate("dealer_id")
        .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
        .sort({ createdAt: 1 });

      if (items.length === 0 && mongoose.Types.ObjectId.isValid(id)) {
        // Also check if id is an inventory item ID
        const singleItem = await InventoryItem.findOne({
          _id: id,
          shop_id: shopId,
          deleted_at: null,
        });
        if (singleItem && singleItem.purchase_invoice_ref) {
          items = await InventoryItem.find({
            shop_id: shopId,
            purchase_invoice_ref: singleItem.purchase_invoice_ref,
            deleted_at: null,
          })
            .populate("product_id")
            .populate("dealer_id")
            .populate("invoice_id", "invoice_number invoice_date customer_name customer_mobile")
            .sort({ createdAt: 1 });
        }
      }
    }

    if (!purchaseOrder && items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receiving slip not found",
      });
    }

    // Structure and group items by product for multi-row view
    const productGroups = {};
    let totalItems = 0;
    let totalCost = 0;

    items.forEach((item) => {
      const prodId = item.product_id?._id?.toString() || item.product_name;
      if (!productGroups[prodId]) {
        productGroups[prodId] = {
          product_id: item.product_id?._id,
          product_name: item.product_name || item.product_id?.product_name || "Unknown Product",
          category:
            item.product_id?.product_category ||
            item.product_id?.category ||
            "OTHER",
          company: item.product_id?.company || "",
          model_number: item.product_id?.model_number || "",
          purchase_price: item.purchase_price || 0,
          quantity: 0,
          subtotal: 0,
          units: [],
        };
      }
      productGroups[prodId].quantity += 1;
      productGroups[prodId].subtotal += item.purchase_price || 0;
      totalItems += 1;
      totalCost += item.purchase_price || 0;

      productGroups[prodId].units.push({
        _id: item._id,
        serial_number: item.serial_number || "N/A",
        status: item.status,
        purchase_price: item.purchase_price,
        invoice_id: item.invoice_id,
        sold_at: item.sold_at,
        created_at: item.createdAt,
      });
    });

    const rows = Object.values(productGroups);

    // If purchaseOrder wasn't found directly, synthesize summary from items
    const slipSummary = purchaseOrder
      ? {
          _id: purchaseOrder._id,
          dealer_invoice_no: purchaseOrder.dealer_invoice_no,
          purchase_date: purchaseOrder.purchase_date,
          dealer: purchaseOrder.dealer_id,
          total_items_count: purchaseOrder.total_items_count || totalItems,
          total_cost: purchaseOrder.total_cost || totalCost,
          notes: purchaseOrder.notes,
          purchase_bill_image: purchaseOrder.purchase_bill_image || "",
          purchase_bill_images:
            purchaseOrder.purchase_bill_images?.length > 0
              ? purchaseOrder.purchase_bill_images
              : [purchaseOrder.purchase_bill_image].filter(Boolean),
          created_by: purchaseOrder.created_by,
          createdAt: purchaseOrder.createdAt,
        }
      : {
          _id: null,
          dealer_invoice_no: items[0]?.purchase_invoice_ref || id,
          purchase_date: items[0]?.purchase_date || items[0]?.createdAt,
          dealer: items[0]?.dealer_id || null,
          total_items_count: totalItems,
          total_cost: totalCost,
          notes: "",
          purchase_bill_image: items[0]?.purchase_bill_image || "",
          purchase_bill_images:
            items[0]?.purchase_bill_images?.length > 0
              ? items[0]?.purchase_bill_images
              : [items[0]?.purchase_bill_image].filter(Boolean),
          created_by: null,
          createdAt: items[0]?.createdAt,
        };

    return res.status(200).json({
      success: true,
      slip: slipSummary,
      rows,
      rawItems: items,
    });
  } catch (error) {
    console.error("Error fetching receiving slip details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch receiving slip details",
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

/**
 * Update Receiving Slip Details and synchronize child inventory items
 */
export const updateReceivingSlip = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const { id } = req.params;
    const { dealer_id, dealer_invoice_no, purchase_date, purchase_bill_image, purchase_bill_images, notes, row_prices, row_names } = req.body;

    const result = await updateReceivingSlipService({
      shopId,
      userId,
      slipId: id,
      dealerId: dealer_id,
      dealerInvoiceNo: dealer_invoice_no,
      purchaseDate: purchase_date,
      purchaseBillImage: purchase_bill_image,
      purchaseBillImages: purchase_bill_images,
      notes,
      rowPrices: row_prices || {},
      rowNames: row_names || {},
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating receiving slip:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update receiving slip",
    });
  }
};

/**
 * List Grouped Purchases (Receiving Slips) with consolidated items, quantities & serials
 */
export const getPurchasesList = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const {
      page = 1,
      limit = 10,
      search = "",
      dealer_id,
      status,
      start_date,
      end_date,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit);

    // 1. Build PO query
    const poQuery = { shop_id: shopId, deleted_at: null };
    if (dealer_id) poQuery.dealer_id = dealer_id;
    if (start_date || end_date) {
      poQuery.purchase_date = {};
      if (start_date) poQuery.purchase_date.$gte = new Date(start_date);
      if (end_date) poQuery.purchase_date.$lte = new Date(end_date);
    }

    // If search term is provided, search in PO fields OR linked item fields (serials, product names) OR dealer name
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      // Find matching dealers
      const matchingDealers = await Dealer.find({
        shop_id: shopId,
        name: searchRegex,
      }).select("_id");
      const matchingDealerIds = matchingDealers.map((d) => d._id);

      // Find matching inventory items by serial_number or product_name or purchase_invoice_ref
      const matchingItems = await InventoryItem.find({
        shop_id: shopId,
        deleted_at: null,
        $or: [
          { serial_number: searchRegex },
          { product_name: searchRegex },
          { purchase_invoice_ref: searchRegex },
        ],
      }).select("purchase_order_id");

      const itemPOIds = matchingItems
        .map((i) => i.purchase_order_id)
        .filter(Boolean);

      poQuery.$or = [
        { dealer_invoice_no: searchRegex },
        { notes: searchRegex },
        { dealer_id: { $in: matchingDealerIds } },
        { _id: { $in: itemPOIds } },
      ];
    }

    // If status filter is provided (e.g. IN_STOCK, SOLD), filter POs having items with that status
    if (status && status.trim()) {
      const statusItems = await InventoryItem.find({
        shop_id: shopId,
        status: status.trim(),
        deleted_at: null,
      }).select("purchase_order_id");

      const statusPOIds = statusItems.map((i) => i.purchase_order_id).filter(Boolean);
      if (poQuery._id && poQuery._id.$in) {
        poQuery._id.$in = poQuery._id.$in.filter((id) =>
          statusPOIds.some((sId) => sId.toString() === id.toString())
        );
      } else {
        poQuery._id = { $in: statusPOIds };
      }
    }

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(poQuery)
        .populate("dealer_id", "name contact_person phone email tax_id deleted_at is_retired")
        .populate("created_by", "first_name last_name email")
        .sort({ purchase_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseOrder.countDocuments(poQuery),
    ]);

    // Fetch all child items for the retrieved purchase orders in a single batch query
    const poIds = purchaseOrders.map((po) => po._id);
    const allItems = await InventoryItem.find({
      shop_id: shopId,
      purchase_order_id: { $in: poIds },
      deleted_at: null,
    })
      .populate("product_id", "product_name category company model_number")
      .populate("invoice_id", "invoice_number invoice_date customer_name")
      .sort({ createdAt: 1 });

    // Group items by purchase_order_id
    const itemsByPO = {};
    allItems.forEach((item) => {
      const poKey = item.purchase_order_id ? item.purchase_order_id.toString() : "unassigned";
      if (!itemsByPO[poKey]) {
        itemsByPO[poKey] = [];
      }
      itemsByPO[poKey].push(item);
    });

    const purchases = [];
    
    purchaseOrders.forEach((po) => {
      const poItems = itemsByPO[po._id.toString()] || [];
      if (poItems.length === 0) return; // Omit empty purchase orders whose items have all been deleted

      // Calculate consolidated products summary
      const productMap = {};
      let totalCostCalculated = 0;
      const serials = [];
      const statusCounts = {
        IN_STOCK: 0,
        SOLD: 0,
        DEFECTIVE_RMA: 0,
        RETURNED: 0,
        UNDER_SERVICE: 0,
      };

      poItems.forEach((item) => {
        const prodName = item.product_name || item.product_id?.product_name || "Unknown Product";
        const cat = item.product_id?.category || item.product_id?.product_category || "General";

        if (!productMap[prodName]) {
          productMap[prodName] = {
            product_name: prodName,
            category: cat,
            count: 0,
            unit_price: item.purchase_price || 0,
            total_price: 0,
            serials: [],
            item_ids: [],
          };
        }
        productMap[prodName].count += 1;
        productMap[prodName].total_price += (item.purchase_price || 0);
        if (item.serial_number) {
          productMap[prodName].serials.push(item.serial_number);
          serials.push(item.serial_number);
        }
        productMap[prodName].item_ids.push(item._id);

        totalCostCalculated += (item.purchase_price || 0);

        if (statusCounts[item.status] !== undefined) {
          statusCounts[item.status] += 1;
        } else {
          statusCounts[item.status] = 1;
        }
      });

      const productsSummary = Object.values(productMap);
      const totalUnits = poItems.length > 0 ? poItems.length : (po.total_items_count || 1);
      const finalTotalCost = po.total_cost > 0 ? po.total_cost : totalCostCalculated;

      purchases.push({
        _id: po._id,
        purchase_order_id: po._id,
        dealer_invoice_no: po.dealer_invoice_no,
        dealer: po.dealer_id,
        purchase_date: po.purchase_date,
        total_cost: finalTotalCost,
        total_items_count: totalUnits,
        products_summary: productsSummary,
        serial_numbers: serials,
        status_breakdown: statusCounts,
        purchase_bill_image: po.purchase_bill_image || "",
        purchase_bill_images: po.purchase_bill_images || [],
        notes: po.notes || "",
        created_by: po.created_by,
        first_item_id: poItems[0]?._id || null,
        created_at: po.createdAt,
      });
    });

    // Also include any legacy orphan items (without purchase_order_id) so no old data is omitted
    const orphanItemsQuery = {
      shop_id: shopId,
      purchase_order_id: null,
      deleted_at: null,
    };
    if (dealer_id) orphanItemsQuery.dealer_id = dealer_id;
    if (status) orphanItemsQuery.status = status;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      orphanItemsQuery.$or = [
        { serial_number: searchRegex },
        { product_name: searchRegex },
        { purchase_invoice_ref: searchRegex },
      ];
    }

    const orphanItems = await InventoryItem.find(orphanItemsQuery)
      .populate("product_id", "product_name category company model_number")
      .populate("dealer_id", "name contact_person phone email")
      .sort({ createdAt: -1 });

    if (orphanItems.length > 0) {
      // Group orphan items by purchase_invoice_ref or individual item
      const orphanGroups = {};
      orphanItems.forEach((item) => {
        const groupKey = item.purchase_invoice_ref?.trim() || `LEGACY-${item._id}`;
        if (!orphanGroups[groupKey]) {
          orphanGroups[groupKey] = {
            _id: item._id,
            purchase_order_id: null,
            dealer_invoice_no: item.purchase_invoice_ref || `PUR-${item.serial_number || item._id.toString().slice(-6)}`,
            dealer: item.dealer_id,
            purchase_date: item.purchase_date || item.createdAt,
            total_cost: 0,
            total_items_count: 0,
            products_summary: [],
            serial_numbers: [],
            status_breakdown: { IN_STOCK: 0, SOLD: 0, DEFECTIVE_RMA: 0, RETURNED: 0, UNDER_SERVICE: 0 },
            purchase_bill_image: item.purchase_bill_image || "",
            purchase_bill_images: item.purchase_bill_images || [],
            notes: "Direct/Legacy Stock Entry",
            created_by: null,
            first_item_id: item._id,
            created_at: item.createdAt,
            _temp_items: [],
          };
        }
        orphanGroups[groupKey].total_cost += (item.purchase_price || 0);
        orphanGroups[groupKey].total_items_count += 1;
        if (item.serial_number) {
          orphanGroups[groupKey].serial_numbers.push(item.serial_number);
        }
        if (orphanGroups[groupKey].status_breakdown[item.status] !== undefined) {
          orphanGroups[groupKey].status_breakdown[item.status] += 1;
        }
        orphanGroups[groupKey]._temp_items.push(item);
      });

      Object.values(orphanGroups).forEach((og) => {
        const prodMap = {};
        og._temp_items.forEach((item) => {
          const pName = item.product_name || item.product_id?.product_name || "Product";
          if (!prodMap[pName]) {
            prodMap[pName] = {
              product_name: pName,
              category: item.product_id?.category || "General",
              count: 0,
              unit_price: item.purchase_price || 0,
              total_price: 0,
              serials: [],
              item_ids: [],
            };
          }
          prodMap[pName].count += 1;
          prodMap[pName].total_price += (item.purchase_price || 0);
          if (item.serial_number) prodMap[pName].serials.push(item.serial_number);
          prodMap[pName].item_ids.push(item._id);
        });
        og.products_summary = Object.values(prodMap);
        delete og._temp_items;
        purchases.push(og);
      });
    }

    return res.status(200).json({
      success: true,
      purchases,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching purchases list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchases list",
      error: error.message,
    });
  }
};

/**
 * Delete / Soft-Delete Single Inventory Item
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { itemId } = req.params;

    const item = await InventoryItem.findOne({
      _id: itemId,
      shop_id: shopId,
      deleted_at: null,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    if (item.status === "SOLD") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an inventory item that is marked as SOLD or linked to an invoice.",
      });
    }

    item.deleted_at = new Date();
    await item.save();

    // If item belonged to a PurchaseOrder, soft-delete PurchaseOrder if no active items remain
    if (item.purchase_order_id) {
      const activeCount = await InventoryItem.countDocuments({
        shop_id: shopId,
        purchase_order_id: item.purchase_order_id,
        deleted_at: null,
      });

      if (activeCount === 0) {
        await PurchaseOrder.findByIdAndUpdate(item.purchase_order_id, {
          deleted_at: new Date(),
        });
      }
    }

    // Log audit trail
    await InventoryAuditLog.create({
      shop_id: shopId,
      inventory_item_id: item._id,
      user_id: req.user.userId,
      action: "DELETED",
      previous_state: {
        status: item.status,
        product_name: item.product_name,
        serial_number: item.serial_number,
      },
      new_state: {
        deleted_at: item.deleted_at,
      },
      notes: "Inventory unit deleted",
    });

    return res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete inventory item",
      error: error.message,
    });
  }
};

