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
  purchaseBillImages,
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

    // 1b. Check duplicate dealer invoice number for this dealer & shop
    if (dealerInvoiceNo && dealerInvoiceNo.trim()) {
      const formattedInvoiceNo = dealerInvoiceNo.trim().toUpperCase();
      const existingPO = await PurchaseOrder.findOne({
        shop_id: shopId,
        dealer_id: dealerId,
        dealer_invoice_no: formattedInvoiceNo,
      }).session(session);

      if (existingPO) {
        throw new Error(
          `A receiving slip with invoice number '${formattedInvoiceNo}' already exists for supplier '${dealer.name}'.`
        );
      }
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

    const normalizedImages = Array.isArray(purchaseBillImages)
      ? purchaseBillImages.filter(Boolean)
      : purchaseBillImage
      ? [purchaseBillImage]
      : [];
    const primaryBillImage = normalizedImages[0] || (typeof purchaseBillImage === "string" ? purchaseBillImage : "");

    // 3. Create PurchaseOrder Header
    const purchaseOrder = new PurchaseOrder({
      shop_id: shopId,
      dealer_id: dealerId,
      dealer_invoice_no: (dealerInvoiceNo || "INTAKE-" + Date.now()).toUpperCase(),
      purchase_date: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchase_bill_image: primaryBillImage,
      purchase_bill_images: normalizedImages,
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

      if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
        product = await ProductMaster.findOne({
          _id: item.product_id,
          shop_id: shopId,
        }).session(session);
      }

      if (!product) {
        let historicalItem = null;
        if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
          historicalItem = await InvoiceItem.findOne({
            _id: item.product_id,
            shop_id: shopId,
          }).session(session);
        }

        const fallbackName = (historicalItem ? historicalItem.product_name : (item.product_name || "")).trim();

        if (fallbackName) {
          // Check if product with same name already exists in this shop (case-insensitive)
          product = await ProductMaster.findOne({
            shop_id: shopId,
            product_name: { $regex: new RegExp(`^${fallbackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          }).session(session);

          if (!product) {
            product = new ProductMaster({
              product_name: fallbackName,
              shop_id: shopId,
              product_category: historicalItem?.product_category || item.product_category || "OTHER",
              company: historicalItem?.company || item.company || "",
              model_number: historicalItem?.model_number || item.model_number || "",
              selling_price: historicalItem?.selling_price || item.selling_price || 0,
              cost_price: Number(item.purchase_price) || historicalItem?.cost_price || 0,
              stock_quantity: 0,
            });
            await product.save({ session });
          }
        }
      }

      if (!product) {
        throw new Error(`Please provide a valid product name for all received items.`);
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
          purchase_bill_image: primaryBillImage,
          purchase_bill_images: normalizedImages,
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
    // 1. Fetch dealer if provided
    let dealer = null;
    if (dealerId) {
      dealer = await Dealer.findOne({
        _id: dealerId,
        shop_id: shopId,
      }).session(session);

      if (!dealer) {
        throw new Error("Selected Dealer / Supplier not found.");
      }
    }

    // 2. Resolve target InventoryItem (itemId could be an InventoryItem ID or an InvoiceItem ID)
    let inventoryItem = null;
    let invoiceItem = null;

    if (mongoose.Types.ObjectId.isValid(itemId)) {
      inventoryItem = await InventoryItem.findOne({
        _id: itemId,
        shop_id: shopId,
        deleted_at: null,
      }).session(session);
    }

    // If not found directly as InventoryItem, check if itemId is an InvoiceItem
    if (!inventoryItem) {
      if (mongoose.Types.ObjectId.isValid(itemId)) {
        invoiceItem = await InvoiceItem.findOne({
          _id: itemId,
          shop_id: shopId,
        }).session(session);
      }
      if (!invoiceItem) {
        invoiceItem = await InvoiceItem.findOne({
          invoice_item_id: itemId,
          shop_id: shopId,
        }).session(session);
      }

      if (invoiceItem) {
        // Check if invoiceItem already has an inventory_item_id
        if (invoiceItem.inventory_item_id) {
          inventoryItem = await InventoryItem.findOne({
            _id: invoiceItem.inventory_item_id,
            shop_id: shopId,
            deleted_at: null,
          }).session(session);
        }

        // Check if an inventory item exists with matching serial number
        if (!inventoryItem && invoiceItem.serial_number) {
          inventoryItem = await InventoryItem.findOne({
            serial_number: invoiceItem.serial_number.trim().toUpperCase(),
            shop_id: shopId,
            deleted_at: null,
          }).session(session);
        }

        // If no InventoryItem exists yet (e.g. direct invoice sale without pre-existing stock), create one
        if (!inventoryItem) {
          let productMaster = await ProductMaster.findOne({
            shop_id: shopId,
            product_name: invoiceItem.product_name,
          }).session(session);

          if (!productMaster) {
            productMaster = new ProductMaster({
              shop_id: shopId,
              product_name: invoiceItem.product_name || "Product",
              product_category: invoiceItem.product_category || "OTHER",
              company: invoiceItem.company || "",
              model_number: invoiceItem.model_number || "",
              selling_price: invoiceItem.selling_price || 0,
              cost_price: invoiceItem.cost_price || 0,
            });
            await productMaster.save({ session });
          }

          inventoryItem = new InventoryItem({
            shop_id: shopId,
            product_id: productMaster._id,
            product_name: invoiceItem.product_name || productMaster.product_name,
            serial_number: (invoiceItem.serial_number || "").trim().toUpperCase(),
            dealer_id: dealerId,
            purchase_date: purchaseDate
              ? new Date(purchaseDate)
              : invoiceItem.warranty_start_date || new Date(),
            purchase_invoice_ref: purchaseInvoiceRef || "",
            purchase_price: invoiceItem.cost_price || 0,
            status: "SOLD",
            invoice_id: invoiceItem.invoice_id,
            invoice_item_id: invoiceItem._id,
            sold_at: invoiceItem.createdAt || new Date(),
          });
          await inventoryItem.save({ session });
        }

        // Link back to invoice item
        invoiceItem.inventory_item_id = inventoryItem._id;
        invoiceItem.dealer_id = dealerId;
        if (dealer) {
          invoiceItem.purchase_source = dealer.name;
        }
        await invoiceItem.save({ session });
      }
    }

    if (!inventoryItem) {
      throw new Error("Inventory item or invoice record not found.");
    }

    // Lock serial_number if item status is SOLD or UNDER_SERVICE
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

    // Synchronize linked InvoiceItem cached dealer details
    if (inventoryItem.invoice_item_id) {
      await InvoiceItem.findByIdAndUpdate(
        inventoryItem.invoice_item_id,
        {
          ...(dealer && { purchase_source: dealer.name }),
          ...(dealerId && { dealer_id: dealerId }),
          inventory_item_id: inventoryItem._id,
        },
        { session }
      );
    } else if (inventoryItem.serial_number) {
      await InvoiceItem.findOneAndUpdate(
        {
          serial_number: inventoryItem.serial_number,
          shop_id: shopId,
        },
        {
          ...(dealer && { purchase_source: dealer.name }),
          ...(dealerId && { dealer_id: dealerId }),
          inventory_item_id: inventoryItem._id,
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

/**
 * Updates an existing Receiving Slip (PurchaseOrder) and synchronizes linked InventoryItems.
 */
export const updateReceivingSlipService = async ({
  shopId,
  userId,
  slipId,
  dealerId,
  dealerInvoiceNo,
  purchaseDate,
  purchaseBillImage,
  purchaseBillImages,
  notes,
  rowPrices = {},
  rowNames = {},
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let purchaseOrder = null;
    if (mongoose.Types.ObjectId.isValid(slipId)) {
      purchaseOrder = await PurchaseOrder.findOne({
        _id: slipId,
        shop_id: shopId,
        deleted_at: null,
      }).session(session);
    }

    if (!purchaseOrder) {
      purchaseOrder = await PurchaseOrder.findOne({
        dealer_invoice_no: slipId.toString().trim().toUpperCase(),
        shop_id: shopId,
        deleted_at: null,
      }).session(session);
    }

    let dealer = null;
    if (dealerId) {
      dealer = await Dealer.findOne({
        _id: dealerId,
        shop_id: shopId,
      }).session(session);

      if (!dealer) {
        throw new Error("Selected Dealer / Supplier not found.");
      }
    }

    const newInvoiceNo = (dealerInvoiceNo || (purchaseOrder ? purchaseOrder.dealer_invoice_no : "")).trim().toUpperCase();

    // Check duplicate if invoice number changed
    if (purchaseOrder && newInvoiceNo && newInvoiceNo !== purchaseOrder.dealer_invoice_no) {
      const existingPO = await PurchaseOrder.findOne({
        _id: { $ne: purchaseOrder._id },
        shop_id: shopId,
        dealer_id: dealerId || purchaseOrder.dealer_id,
        dealer_invoice_no: newInvoiceNo,
        deleted_at: null,
      }).session(session);

      if (existingPO) {
        throw new Error(`A receiving slip with invoice number '${newInvoiceNo}' already exists for this supplier.`);
      }
    }

    const previousInvoiceNo = purchaseOrder ? purchaseOrder.dealer_invoice_no : slipId;

    const normalizedImages = Array.isArray(purchaseBillImages)
      ? purchaseBillImages.filter(Boolean)
      : purchaseBillImage
      ? [purchaseBillImage]
      : [];
    const primaryBillImage = normalizedImages[0] || (typeof purchaseBillImage === "string" ? purchaseBillImage : "");

    if (purchaseOrder) {
      if (dealerId) purchaseOrder.dealer_id = dealerId;
      if (newInvoiceNo) purchaseOrder.dealer_invoice_no = newInvoiceNo;
      if (purchaseDate) purchaseOrder.purchase_date = new Date(purchaseDate);
      if (purchaseBillImage !== undefined || purchaseBillImages !== undefined) {
        purchaseOrder.purchase_bill_image = primaryBillImage;
        purchaseOrder.purchase_bill_images = normalizedImages;
      }
      if (notes !== undefined) purchaseOrder.notes = notes;
      await purchaseOrder.save({ session });
    }

    // Update all linked InventoryItem records
    const itemQuery = {
      shop_id: shopId,
      deleted_at: null,
    };

    const prevNoRegex = previousInvoiceNo ? new RegExp(`^${previousInvoiceNo.toString().trim()}$`, "i") : null;

    if (purchaseOrder) {
      itemQuery.$or = [
        { purchase_order_id: purchaseOrder._id },
        ...(prevNoRegex ? [{ purchase_invoice_ref: prevNoRegex }] : []),
      ];
    } else if (prevNoRegex) {
      itemQuery.purchase_invoice_ref = prevNoRegex;
    }

    const linkedItems = await InventoryItem.find(itemQuery).session(session);

    let totalCost = 0;
    for (const invItem of linkedItems) {
      if (dealerId) invItem.dealer_id = dealerId;
      if (newInvoiceNo) invItem.purchase_invoice_ref = newInvoiceNo;
      if (purchaseDate) invItem.purchase_date = new Date(purchaseDate);
      if (purchaseBillImage !== undefined || purchaseBillImages !== undefined) {
        invItem.purchase_bill_image = primaryBillImage;
        invItem.purchase_bill_images = normalizedImages;
      }
      if (purchaseOrder && !invItem.purchase_order_id) invItem.purchase_order_id = purchaseOrder._id;

      // Check if price update was supplied for this product
      const prodIdStr = invItem.product_id?._id?.toString() || invItem.product_id?.toString();
      if (prodIdStr && rowPrices[prodIdStr] !== undefined) {
        invItem.purchase_price = Number(rowPrices[prodIdStr]) || 0;
      }

      // Check if name update was supplied for this product
      if (prodIdStr && rowNames[prodIdStr] !== undefined && rowNames[prodIdStr].trim()) {
        const updatedName = rowNames[prodIdStr].trim();
        invItem.product_name = updatedName;
        if (invItem.product_id) {
          await ProductMaster.findByIdAndUpdate(
            invItem.product_id,
            { product_name: updatedName },
            { session }
          );
        }
      }

      await invItem.save({ session });
      totalCost += invItem.purchase_price || 0;

      // Audit Log
      await InventoryAuditLog.create(
        [
          {
            shop_id: shopId,
            inventory_item_id: invItem._id,
            user_id: userId,
            action: "RECEIVING_SLIP_UPDATE",
            new_state: {
              dealer_id: dealerId || invItem.dealer_id,
              purchase_invoice_ref: newInvoiceNo || invItem.purchase_invoice_ref,
              purchase_price: invItem.purchase_price,
              product_name: invItem.product_name,
            },
            notes: `Receiving slip metadata updated (#${newInvoiceNo || previousInvoiceNo})`,
          },
        ],
        { session }
      );
    }

    if (purchaseOrder) {
      purchaseOrder.total_cost = totalCost;
      purchaseOrder.total_items_count = linkedItems.length;
      await purchaseOrder.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Receiving slip updated successfully.",
      purchaseOrder,
      updatedItemsCount: linkedItems.length,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
