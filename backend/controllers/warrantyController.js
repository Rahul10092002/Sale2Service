import InventoryItem from "../models/InventoryItem.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Customer from "../models/Customer.js";
import Dealer from "../models/Dealer.js";
import InventoryAuditLog from "../models/InventoryAuditLog.js";

/**
 * Format Invoice with Customer details for response
 */
const formatInvoiceCustomer = (invoice) => {
  if (!invoice) return null;
  const customer = invoice.customer_id;
  const isCustObj = customer && typeof customer === "object";

  const customerName = isCustObj
    ? customer.full_name
    : invoice.customer_name || "N/A";
  const customerMobile = isCustObj
    ? customer.whatsapp_number || customer.alternate_phone || ""
    : invoice.customer_mobile || "N/A";
  const customerEmail = isCustObj ? customer.email || "" : "";
  const customerAddress =
    isCustObj && customer.address
      ? [
          customer.address.line1,
          customer.address.line2,
          customer.address.city,
          customer.address.state,
          customer.address.pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

  return {
    _id: invoice._id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    customer_id: isCustObj ? customer._id : customer,
    customer_name: customerName,
    customer_mobile: customerMobile,
    customer_email: customerEmail,
    customer_address: customerAddress,
  };
};

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

const findMatchingInvoiceIds = async (shopId, searchRegex) => {
  const matchingCustomers = await Customer.find({
    shop_id: shopId,
    $or: [
      { full_name: searchRegex },
      { whatsapp_number: searchRegex },
      { alternate_phone: searchRegex },
      { email: searchRegex },
    ],
    deleted_at: null,
  }).select("_id");

  const customerIds = matchingCustomers.map((c) => c._id);

  const matchingInvoices = await Invoice.find({
    shop_id: shopId,
    $or: [
      { invoice_number: searchRegex },
      ...(customerIds.length > 0 ? [{ customer_id: { $in: customerIds } }] : []),
    ],
    deleted_at: null,
  }).select("_id");

  return matchingInvoices.map((inv) => inv._id);
};

// 2. Search via Customers & Invoices if no exact serial match
    if (inventoryItems.length === 0) {
      const invoiceIds = await findMatchingInvoiceIds(shopId, searchRegex);

      inventoryItems = await InventoryItem.find({
        shop_id: shopId,
        $or: [
          { serial_number: searchRegex },
          { product_name: searchRegex },
          ...(invoiceIds.length > 0 ? [{ invoice_id: { $in: invoiceIds } }] : []),
        ],
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

    // 3. Fallback: Search InvoiceItem records directly (for legacy invoices or replaced serials)
    if (inventoryItems.length === 0) {
      const invoiceIds = await findMatchingInvoiceIds(shopId, searchRegex);

      const matchingInvoiceItems = await InvoiceItem.find({
        shop_id: shopId,
        $or: [
          { serial_number: searchRegex },
          { previous_serial_number: searchRegex },
          { product_name: searchRegex },
          { invoice_item_id: searchTerm },
          ...(invoiceIds.length > 0 ? [{ invoice_id: { $in: invoiceIds } }] : []),
        ],
        deleted_at: null,
      }).populate({
        path: "invoice_id",
        populate: { path: "customer_id" },
      });

      if (matchingInvoiceItems.length > 0) {
        const dealerIds = [...new Set(matchingInvoiceItems.map((item) => item.dealer_id).filter(Boolean))];
        const dealers = dealerIds.length > 0 ? await Dealer.find({ _id: { $in: dealerIds } }) : [];
        const dealerMap = new Map(dealers.map((d) => [String(d._id), d]));

        // Map to virtual lookup response format
        const results = matchingInvoiceItems.map((item) => {
          const dealer = item.dealer_id ? dealerMap.get(String(item.dealer_id)) : null;
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
            invoice: formatInvoiceCustomer(item.invoice_id),
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
        });

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
          invoice: formatInvoiceCustomer(invoice),
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

/**
 * Autocomplete / Suggestions for Warranty & RMA Search
 */
export const getWarrantySuggestions = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { query = "" } = req.query;
    const searchTerm = query.trim();

    if (!searchTerm) {
      // Return recent sold/active items, recent invoices, recent customers
      const [recentItems, recentInvoices, recentCustomers] = await Promise.all([
        InventoryItem.find({
          shop_id: shopId,
          serial_number: { $nin: ["", null] },
          deleted_at: null,
        })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("serial_number product_name status"),
        Invoice.find({ shop_id: shopId, deleted_at: null })
          .populate("customer_id", "full_name whatsapp_number")
          .sort({ invoice_date: -1 })
          .limit(5)
          .select("invoice_number invoice_date customer_id"),
        Customer.find({ shop_id: shopId, deleted_at: null })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("full_name whatsapp_number"),
      ]);

      const suggestions = [
        ...recentItems.map((item) => ({
          type: "serial",
          value: item.serial_number,
          title: item.serial_number,
          subtitle: `${item.product_name} • ${item.status || "IN_STOCK"}`,
          badge: "Serial",
        })),
        ...recentInvoices.map((inv) => ({
          type: "invoice",
          value: inv.invoice_number,
          title: inv.invoice_number,
          subtitle: `${inv.customer_id?.full_name || "Customer"} • ${new Date(inv.invoice_date).toLocaleDateString("en-IN")}`,
          badge: "Invoice",
        })),
        ...recentCustomers.map((cust) => ({
          type: "customer",
          value: cust.full_name,
          title: cust.full_name,
          subtitle: cust.whatsapp_number || "Customer",
          badge: "Customer",
        })),
      ];

      return res.status(200).json({ success: true, suggestions });
    }

    const regex = new RegExp(searchTerm, "i");

    // Search across InventoryItem, InvoiceItem, Invoice, Customer in parallel
    const [
      matchingSerials,
      matchingInvoiceItems,
      matchingInvoices,
      matchingCustomers,
      matchingProducts,
    ] = await Promise.all([
      InventoryItem.find({
        shop_id: shopId,
        $or: [
          { serial_number: regex },
          { product_name: regex },
        ],
        deleted_at: null,
      })
        .limit(6)
        .select("serial_number product_name status"),
      InvoiceItem.find({
        shop_id: shopId,
        $or: [
          { serial_number: regex },
          { previous_serial_number: regex },
        ],
        deleted_at: null,
      })
        .limit(6)
        .select("serial_number product_name"),
      Invoice.find({
        shop_id: shopId,
        invoice_number: regex,
        deleted_at: null,
      })
        .populate("customer_id", "full_name whatsapp_number")
        .limit(5)
        .select("invoice_number invoice_date customer_id"),
      Customer.find({
        shop_id: shopId,
        $or: [
          { full_name: regex },
          { whatsapp_number: regex },
          { alternate_phone: regex },
        ],
        deleted_at: null,
      })
        .limit(5)
        .select("full_name whatsapp_number"),
      InvoiceItem.find({
        shop_id: shopId,
        $or: [
          { product_name: regex },
          { company: regex },
          { model_number: regex },
        ],
        deleted_at: null,
      })
        .limit(5)
        .select("product_name company model_number product_category"),
    ]);

    const seenValues = new Set();
    const suggestions = [];

    // Add Serials
    for (const item of matchingSerials) {
      if (item.serial_number && !seenValues.has(item.serial_number.toUpperCase())) {
        seenValues.add(item.serial_number.toUpperCase());
        suggestions.push({
          type: "serial",
          value: item.serial_number,
          title: item.serial_number,
          subtitle: `${item.product_name} • ${item.status || "IN_STOCK"}`,
          badge: "Serial",
        });
      }
    }

    for (const item of matchingInvoiceItems) {
      if (item.serial_number && !seenValues.has(item.serial_number.toUpperCase())) {
        seenValues.add(item.serial_number.toUpperCase());
        suggestions.push({
          type: "serial",
          value: item.serial_number,
          title: item.serial_number,
          subtitle: `${item.product_name || "Product"} • Invoice Item`,
          badge: "Serial",
        });
      }
    }

    // Add Invoices
    for (const inv of matchingInvoices) {
      if (!seenValues.has(inv.invoice_number)) {
        seenValues.add(inv.invoice_number);
        suggestions.push({
          type: "invoice",
          value: inv.invoice_number,
          title: inv.invoice_number,
          subtitle: `${inv.customer_id?.full_name || "Customer"} • ${new Date(inv.invoice_date).toLocaleDateString("en-IN")}`,
          badge: "Invoice",
        });
      }
    }

    // Add Customers
    for (const cust of matchingCustomers) {
      if (!seenValues.has(cust.full_name)) {
        seenValues.add(cust.full_name);
        suggestions.push({
          type: "customer",
          value: cust.full_name,
          title: cust.full_name,
          subtitle: cust.whatsapp_number,
          badge: "Customer",
        });
      }
    }

    // Add Products
    for (const prod of matchingProducts) {
      if (!seenValues.has(prod.product_name)) {
        seenValues.add(prod.product_name);
        suggestions.push({
          type: "product",
          value: prod.product_name,
          title: prod.product_name,
          subtitle: `${prod.company || ""} ${prod.model_number ? `(${prod.model_number})` : ""} • ${prod.product_category || "Product"}`.trim(),
          badge: "Product",
        });
      }
    }

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error("Error fetching warranty suggestions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      error: error.message,
    });
  }
};
