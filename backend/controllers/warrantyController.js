import InventoryItem from "../models/InventoryItem.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Dealer from "../models/Dealer.js";
import ProductMaster from "../models/ProductMaster.js";
import InventoryAuditLog from "../models/InventoryAuditLog.js";

/**
 * Instant Warranty & Support Lookup Endpoint
 */
export const lookupWarranty = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query (Serial Number, Customer Phone, Customer Name, or Invoice #) is required.",
      });
    }

    const searchTerm = query.trim();
    const searchRegex = new RegExp(searchTerm, "i");

    // 1. Direct Search in InventoryItems by serial_number
    let inventoryItems = await InventoryItem.find({
      shop_id: shopId,
      serial_number: searchTerm.toUpperCase(),
      deleted_at: null,
    })
      .populate("product_id")
      .populate("dealer_id")
      .populate({
        path: "invoice_id",
        populate: { path: "customer_id" },
      })
      .populate("invoice_item_id");

    // 2. If no direct serial match, search via Invoices (by customer_mobile, customer_name, or invoice_number)
    if (inventoryItems.length === 0) {
      const matchingInvoices = await Invoice.find({
        shop_id: shopId,
        $or: [
          { invoice_number: searchRegex },
          { customer_name: searchRegex },
          { customer_mobile: searchRegex },
        ],
        deleted_at: null,
      }).select("_id");

      const invoiceIds = matchingInvoices.map((inv) => inv._id);

      if (invoiceIds.length > 0) {
        inventoryItems = await InventoryItem.find({
          shop_id: shopId,
          invoice_id: { $in: invoiceIds },
          deleted_at: null,
        })
          .populate("product_id")
          .populate("dealer_id")
          .populate({
            path: "invoice_id",
            populate: { path: "customer_id" },
          })
          .populate("invoice_item_id");
      }
    }

    // 3. Fallback: Search InvoiceItem records directly (for legacy invoices or replaced serials)
    if (inventoryItems.length === 0) {
      const matchingInvoiceItems = await InvoiceItem.find({
        shop_id: shopId,
        $or: [
          { serial_number: searchTerm.toUpperCase() },
          { previous_serial_number: searchTerm.toUpperCase() },
          { invoice_item_id: searchTerm },
        ],
        deleted_at: null,
      }).populate({
        path: "invoice_id",
        populate: { path: "customer_id" },
      });

      if (matchingInvoiceItems.length > 0) {
        // Map to virtual lookup response format
        const results = await Promise.all(
          matchingInvoiceItems.map(async (item) => {
            const dealer = item.dealer_id
              ? await Dealer.findById(item.dealer_id)
              : null;

            const now = new Date();
            const endDate = item.warranty_end_date ? new Date(item.warranty_end_date) : null;
            const isExpired = endDate ? endDate < now : false;

            return {
              type: "LEGACY_OR_INVOICE_ITEM",
              inventory_item_id: item.inventory_item_id || item._id,
              serial_number: item.serial_number || "N/A (Legacy)",
              product_name: item.product_name,
              product_category: item.product_category,
              company: item.company,
              model_number: item.model_number,
              status: item.status,
              invoice: item.invoice_id
                ? {
                    _id: item.invoice_id._id,
                    invoice_number: item.invoice_id.invoice_number,
                    invoice_date: item.invoice_id.invoice_date,
                    customer_name: item.invoice_id.customer_name,
                    customer_mobile: item.invoice_id.customer_mobile,
                  }
                : null,
              dealer: dealer
                ? {
                    _id: dealer._id,
                    name: dealer.name,
                    contact_person: dealer.contact_person,
                    phone: dealer.phone,
                    email: dealer.email,
                    address: dealer.address,
                    tax_id: dealer.tax_id,
                    is_retired: Boolean(dealer.deleted_at),
                  }
                : item.purchase_source
                ? { name: item.purchase_source, is_retired: false }
                : null,
              warranty: {
                start_date: item.warranty_start_date,
                end_date: item.warranty_end_date,
                duration_months: item.warranty_duration_months,
                warranty_type: item.warranty_type,
                is_expired: isExpired,
              },
            };
          })
        );

        return res.status(200).json({
          success: true,
          count: results.length,
          results,
        });
      }
    }

    // Process found InventoryItem records
    const results = await Promise.all(
      inventoryItems.map(async (item) => {
        const product = item.product_id || {};
        const dealer = item.dealer_id || null;
        const invoice = item.invoice_id || null;
        const invoiceItem = item.invoice_item_id || {};

        // Fetch Audit Logs for this item
        const logs = await InventoryAuditLog.find({
          shop_id: shopId,
          inventory_item_id: item._id,
        }).sort({ createdAt: -1 });

        // Calculate warranty details
        const startDate = invoiceItem.warranty_start_date || invoice?.invoice_date || item.sold_at || item.createdAt;
        const duration = invoiceItem.warranty_duration_months || product.warranty_duration_months || 12;
        const endDate = invoiceItem.warranty_end_date || (startDate ? new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + duration)) : null);
        const isExpired = endDate ? new Date(endDate) < new Date() : false;

        return {
          type: "INVENTORY_ITEM",
          inventory_item_id: item._id,
          serial_number: item.serial_number || "N/A",
          product_name: item.product_name,
          product_category: product.product_category || invoiceItem.product_category || "OTHER",
          company: product.company || invoiceItem.company || "",
          model_number: product.model_number || invoiceItem.model_number || "",
          status: item.status,
          purchase_date: item.purchase_date,
          purchase_invoice_ref: item.purchase_invoice_ref,
          sold_at: item.sold_at,
          invoice: invoice
            ? {
                _id: invoice._id,
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                customer_name: invoice.customer_name,
                customer_mobile: invoice.customer_mobile,
              }
            : null,
          dealer: dealer
            ? {
                _id: dealer._id,
                name: dealer.name,
                contact_person: dealer.contact_person,
                phone: dealer.phone,
                email: dealer.email,
                address: dealer.address,
                tax_id: dealer.tax_id,
                is_retired: Boolean(dealer.deleted_at),
              }
            : null,
          warranty: {
            start_date: startDate,
            end_date: endDate,
            duration_months: duration,
            warranty_type: invoiceItem.warranty_type || product.warranty_type || "STANDARD",
            is_expired: isExpired,
          },
          audit_logs: logs,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in warranty lookup:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform warranty lookup",
      error: error.message,
    });
  }
};
