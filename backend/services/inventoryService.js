import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import ProductMaster from "../models/ProductMaster.js";
import Dealer from "../models/Dealer.js";
import InvoiceItem from "../models/InvoiceItem.js";
import InventoryAuditLog from "../models/InventoryAuditLog.js";

/**
 * Creates a Receiving Slip (Multi-Row Purchase Intake) in a single Mongoose transaction.
 */
export const createReceivingSlipIntakeService = async ({
  shopId,
  userId,
  dealerId,
  dealerInvoiceNo,
  purchaseDate,
  purchaseBillImage,
  notes,
  items, // array of { product_id, purchase_price, serial_numbers }
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify Dealer exists
    const dealer = await Dealer.findOne({
      _id: dealerId,
      shop_id: shopId,
    }).session(session);

    if (!dealer) {
      throw new Error("Selected Dealer not found.");
    }

    // 2. Collect all non-empty serial numbers for batch duplicate validation
    const allSerials = [];
    items.forEach((item) => {
      if (Array.isArray(item.serial_numbers)) {
        item.serial_numbers.forEach((sn) => {
          const trimmed = (sn || "").trim().toUpperCase();
          if (trimmed) {
            if (allSerials.includes(trimmed)) {
              throw new Error(`Duplicate serial number '${trimmed}' found within the receiving slip batch.`);
            }
            allSerials.push(trimmed);
          }
        });
      }
    });

    // Check database for pre-existing serial numbers in shop
    if (allSerials.length > 0) {
      const existingSerialDocs = await InventoryItem.find({
        shop_id: shopId,
        serial_number: { $in: allSerials },
        deleted_at: null,
      }).session(session);

      if (existingSerialDocs.length > 0) {
        const found = existingSerialDocs.map((doc) => doc.serial_number).join(", ");
        throw new Error(`Serial number(s) already exist in inventory: ${found}`);
      }
    }

    // Calculate totals
    let totalItemsCount = 0;
    let totalCost = 0;

    items.forEach((item) => {
      const count = Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0
        ? item.serial_numbers.length
        : Number(item.quantity || 1);
      totalItemsCount += count;
      totalCost += (Number(item.purchase_price) || 0) * count;
    });

    // 3. Create PurchaseOrder Header
    const purchaseOrder = new PurchaseOrder({
      shop_id: shopId,
      dealer_id: dealerId,
      dealer_invoice_no: (dealerInvoiceNo || "INTAKE-" + Date.now()).toUpperCase(),
      purchase_date: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchase_bill_image: purchaseBillImage || "",
      total_cost: totalCost,
      total_items_count: totalItemsCount,
      notes: notes || "",
      created_by: userId,
    });
    await purchaseOrder.save({ session });

    const createdInventoryItems = [];

    // 4. Loop through items & create InventoryItem records
    for (const item of items) {
      let product = null;

      if (mongoose.Types.ObjectId.isValid(item.product_id)) {
        product = await ProductMaster.findOne({
          _id: item.product_id,
          shop_id: shopId,
        }).session(session);
      }

      if (!product) {
        let historicalItem = null;
        if (mongoose.Types.ObjectId.isValid(item.product_id)) {
          historicalItem = await InvoiceItem.findOne({
            _id: item.product_id,
            shop_id: shopId,
          }).session(session);
        }

        const fallbackName = historicalItem ? historicalItem.product_name : (item.product_name || "").trim();

        if (fallbackName) {
          product = await ProductMaster.findOneAndUpdate(
            { product_name: fallbackName, shop_id: shopId },
            {
              $setOnInsert: {
                product_name: fallbackName,
                shop_id: shopId,
                product_category: historicalItem?.product_category || item.product_category || "OTHER",
                company: historicalItem?.company || item.company || "",
                model_number: historicalItem?.model_number || item.model_number || "",
                selling_price: historicalItem?.selling_price || item.selling_price || 0,
                cost_price: Number(item.purchase_price) || historicalItem?.cost_price || 0,
                stock_quantity: 0,
              },
            },
            { upsert: true, new: true, session }
          );
        }
      }

      if (!product) {
        throw new Error(`Product record for ID '${item.product_id}' could not be resolved.`);
      }

      const serials = Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0
        ? item.serial_numbers
        : [""]; // Handle legacy/serial-less items

      for (const rawSerial of serials) {
        const serialNumber = (rawSerial || "").trim().toUpperCase();

        const invItem = new InventoryItem({
          shop_id: shopId,
          product_id: product._id,
          product_name: product.product_name,
          purchase_order_id: purchaseOrder._id,
          serial_number: serialNumber,
          dealer_id: dealerId,
          purchase_date: purchaseOrder.purchase_date,
          purchase_invoice_ref: purchaseOrder.dealer_invoice_no,
          purchase_price: Number(item.purchase_price) || 0,
          status: "IN_STOCK",
        });

        await invItem.save({ session });
        createdInventoryItems.push(invItem);

        // Record Audit Log
        await InventoryAuditLog.create(
          [
            {
              shop_id: shopId,
              inventory_item_id: invItem._id,
              user_id: userId,
              action: "PURCHASE_INTAKE",
              new_state: {
                dealer_id: dealerId,
                dealer_name: dealer.name,
                serial_number: serialNumber,
                purchase_invoice_ref: purchaseOrder.dealer_invoice_no,
              },
              notes: `Batch intake via Receiving Slip #${purchaseOrder.dealer_invoice_no}`,
            },
          ],
          { session }
        );
      }

      // Reconcile ProductMaster stock quantity (+ count)
      const addedQuantity = serials.length;
      product.stock_quantity = (product.stock_quantity || 0) + addedQuantity;
      await product.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: `Receiving Slip processed successfully. Added ${createdInventoryItems.length} unit(s).`,
      purchaseOrder,
      inventoryItemsCount: createdInventoryItems.length,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Handles retroactive post-sale dealer and origin association with Serial Immutability post-sale.
 */
export const linkRetroactiveDealerService = async ({
  shopId,
  userId,
  itemId,
  dealerId,
  serialNumber,
  purchaseDate,
  purchaseInvoiceRef,
  notes,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch InventoryItem
    const inventoryItem = await InventoryItem.findOne({
      _id: itemId,
      shop_id: shopId,
      deleted_at: null,
    }).session(session);

    if (!inventoryItem) {
      throw new Error("Inventory item not found.");
    }

    // CRITICAL FLAW #1 FIX: Lock serial_number if item status is SOLD or UNDER_SERVICE
    const isSoldOrInService = ["SOLD", "UNDER_SERVICE"].includes(inventoryItem.status);
    const newSerialUpper = (serialNumber || "").trim().toUpperCase();

    if (
      isSoldOrInService &&
      newSerialUpper &&
      inventoryItem.serial_number &&
      newSerialUpper !== inventoryItem.serial_number
    ) {
      throw new Error(
        "Serial Number cannot be altered for an item that is already sold or under service. Only origin dealer details can be updated."
      );
    }

    // MISSING SCENARIO C FIX: Fetch dealer including soft-deleted ones for historical edits
    let dealer = null;
    if (dealerId) {
      dealer = await Dealer.findOne({
        _id: dealerId,
        shop_id: shopId,
      }).session(session);

      if (!dealer) {
        throw new Error("Selected Dealer not found.");
      }
    }

    const previousState = {
      dealer_id: inventoryItem.dealer_id,
      serial_number: inventoryItem.serial_number,
      purchase_date: inventoryItem.purchase_date,
      purchase_invoice_ref: inventoryItem.purchase_invoice_ref,
    };

    // Update origin fields
    if (dealerId) inventoryItem.dealer_id = dealerId;
    if (!isSoldOrInService && newSerialUpper) {
      inventoryItem.serial_number = newSerialUpper;
    }
    if (purchaseDate) inventoryItem.purchase_date = new Date(purchaseDate);
    if (purchaseInvoiceRef !== undefined) inventoryItem.purchase_invoice_ref = purchaseInvoiceRef;

    await inventoryItem.save({ session });

    // Synchronize linked InvoiceItem cached dealer details (does NOT alter invoice financials)
    if (inventoryItem.invoice_item_id) {
      await InvoiceItem.findByIdAndUpdate(
        inventoryItem.invoice_item_id,
        {
          ...(dealer && { purchase_source: dealer.name }),
          ...(dealerId && { dealer_id: dealerId }),
        },
        { session }
      );
    }

    // Create Audit Log
    await InventoryAuditLog.create(
      [
        {
          shop_id: shopId,
          inventory_item_id: inventoryItem._id,
          user_id: userId,
          action: "RETROACTIVE_DEALER_LINK",
          previous_state: previousState,
          new_state: {
            dealer_id: inventoryItem.dealer_id,
            serial_number: inventoryItem.serial_number,
            purchase_date: inventoryItem.purchase_date,
            purchase_invoice_ref: inventoryItem.purchase_invoice_ref,
          },
          notes: notes || "Retroactive origin linkage updated",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Origin dealer linked successfully",
      inventoryItem,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Reconciles stock quantity for status transitions (e.g. RETURNED vs DEFECTIVE_RMA)
 */
export const reconcileInventoryStatusService = async ({
  shopId,
  userId,
  itemId,
  newStatus,
  notes,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const inventoryItem = await InventoryItem.findOne({
      _id: itemId,
      shop_id: shopId,
      deleted_at: null,
    }).session(session);

    if (!inventoryItem) {
      throw new Error("Inventory item not found.");
    }

    const prevStatus = inventoryItem.status;
    if (prevStatus === newStatus) {
      await session.commitTransaction();
      session.endSession();
      return { success: true, inventoryItem };
    }

    const product = await ProductMaster.findOne({
      _id: inventoryItem.product_id,
      shop_id: shopId,
    }).session(session);

    // Stock Reconciliation Engine Rules:
    // IN_STOCK -> SOLD: -1
    // SOLD -> RETURNED (Resellable): +1
    // SOLD -> DEFECTIVE_RMA: 0 (Loss/RMA, not resellable stock)
    // DEFECTIVE_RMA -> IN_STOCK: +1
    if (product) {
      if (prevStatus === "IN_STOCK" && newStatus === "SOLD") {
        product.stock_quantity = Math.max(0, (product.stock_quantity || 0) - 1);
      } else if (prevStatus === "SOLD" && newStatus === "RETURNED") {
        product.stock_quantity = (product.stock_quantity || 0) + 1;
      } else if (prevStatus === "DEFECTIVE_RMA" && newStatus === "IN_STOCK") {
        product.stock_quantity = (product.stock_quantity || 0) + 1;
      }
      await product.save({ session });
    }

    inventoryItem.status = newStatus;
    await inventoryItem.save({ session });

    // Audit Log
    await InventoryAuditLog.create(
      [
        {
          shop_id: shopId,
          inventory_item_id: inventoryItem._id,
          user_id: userId,
          action: "STATUS_CHANGE",
          previous_state: { status: prevStatus },
          new_state: { status: newStatus },
          notes: notes || `Status changed from ${prevStatus} to ${newStatus}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: `Status updated from ${prevStatus} to ${newStatus}`,
      inventoryItem,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
