import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";

// Create a new customer
export const createCustomer = async (req, res) => {
  try {
    const { user } = req;
    const payload = req.body;

    if (!payload.full_name || !payload.whatsapp_number) {
      return res.status(400).json({
        success: false,
        message: "full_name and whatsapp_number are required",
      });
    }

    const existing = await Customer.findOne({
      whatsapp_number: payload.whatsapp_number,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Customer with this Whatsapp number already exists",
      });
    }

    const customer = new Customer({
      ...payload,
      shop_id: user.shopId,
    });

    await customer.save();

    res.status(201).json({ success: true, data: { customer } });
  } catch (error) {
    console.error("Create customer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create customer" });
  }
};

// Get customers list (single-trip aggregation pipeline with pagination + search)
export const getCustomers = async (req, res) => {
  try {
    const { user } = req;
    const { page = 1, limit = 25, search, sort = "name_asc" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 25), 100);
    const skip = (pageNum - 1) * limitNum;

    const matchQuery = {
      shop_id: new mongoose.Types.ObjectId(user.shopId),
      deleted_at: null,
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      matchQuery.$or = [
        { full_name: regex },
        { whatsapp_number: regex },
        { email: regex },
      ];
    }

    let sortStage = { full_name: 1, createdAt: -1 };
    if (sort === "createdAt_desc") {
      sortStage = { createdAt: -1 };
    } else if (sort === "name_desc") {
      sortStage = { full_name: -1, createdAt: -1 };
    }

    const result = await Customer.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          customers: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limitNum },
            {
              $lookup: {
                from: "invoices",
                let: { customerId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$customer_id", "$$customerId"] },
                          { $eq: ["$deleted_at", null] },
                        ],
                      },
                    },
                  },
                ],
                as: "invoices_summary",
              },
            },
            {
              $addFields: {
                total_invoiced: { $sum: "$invoices_summary.total_amount" },
                total_paid: { $sum: "$invoices_summary.amount_paid" },
                total_due: { $sum: "$invoices_summary.amount_due" },
                total_invoices: { $size: "$invoices_summary" },
              },
            },
            {
              $project: {
                invoices_summary: 0,
              },
            },
          ],
        },
      },
    ]);

    const total = result[0]?.metadata[0]?.total || 0;
    const customers = result[0]?.customers || [];

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customers" });
  }
};

// Get single customer by ID and their invoices
export const getCustomerById = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const invoices = await Invoice.find({
      customer_id: customer._id,
      shop_id: user.shopId,
      deleted_at: null,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: { customer, invoices } });
  } catch (error) {
    console.error("Get customer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customer" });
  }
};

// Update customer (with field whitelisting protection)
export const updateCustomer = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const payload = req.body;

    const customer = await Customer.findOne({
      _id: id,
      shop_id: user.shopId,
      deleted_at: null,
    });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const ALLOWED_FIELDS = [
      "full_name",
      "whatsapp_number",
      "email",
      "alternate_phone",
      "address",
      "date_of_birth",
      "anniversary_date",
      "gst_number",
      "customer_type",
      "preferred_language",
      "notes",
      "customer_images",
      "id_proof_files",
      "address_proof_files",
    ];

    ALLOWED_FIELDS.forEach((field) => {
      if (payload[field] !== undefined) {
        customer[field] = payload[field];
      }
    });

    customer.updated_at = new Date();
    await customer.save();

    res.json({ success: true, data: { customer } });
  } catch (error) {
    console.error("Update customer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update customer" });
  }
};

// Soft delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      shop_id: user.shopId,
      deleted_at: null,
    });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    customer.deleted_at = new Date();
    await customer.save();

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete customer" });
  }
};

// Get detailed financial ledger for a single customer
export const getCustomerLedger = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { startDate, endDate, status } = req.query;

    const customer = await Customer.findOne({
      _id: id,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const matchQuery = {
      customer_id: new mongoose.Types.ObjectId(id),
      shop_id: new mongoose.Types.ObjectId(user.shopId),
      deleted_at: null,
    };

    if (startDate || endDate) {
      matchQuery.invoice_date = {};
      if (startDate) matchQuery.invoice_date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.invoice_date.$lte = end;
      }
    }

    if (status && status !== "ALL") {
      matchQuery.payment_status = status.toUpperCase();
    }

    // Fetch invoices sorted chronologically for correct running balance calculation
    const rawInvoices = await Invoice.find(matchQuery)
      .sort({ invoice_date: 1, createdAt: 1 })
      .lean();

    let cumulativeBalance = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const ledgerEntries = rawInvoices.map((inv) => {
      const debit = Number(inv.total_amount || 0);
      const credit = Number(inv.amount_paid || 0);
      const invoiceBalance = Math.max(0, debit - credit);

      cumulativeBalance += invoiceBalance;
      totalInvoiced += debit;
      totalPaid += credit;
      totalDue += invoiceBalance;

      if (inv.payment_status === "PAID") paidCount++;
      else if (inv.payment_status === "PARTIAL") partialCount++;
      else unpaidCount++;

      // Construct a concise items summary string
      let itemsSummary = "";
      if (Array.isArray(inv.services) && inv.services.length > 0) {
        itemsSummary = inv.services.map((s) => s.product_name).join(", ");
      } else {
        itemsSummary = "Standard Invoice";
      }

      return {
        _id: inv._id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date || inv.createdAt,
        payment_mode: inv.payment_mode || "CASH",
        payment_status: inv.payment_status || "UNPAID",
        items_summary: itemsSummary,
        debit,
        credit,
        invoice_balance: invoiceBalance,
        running_balance: cumulativeBalance,
      };
    });

    res.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          full_name: customer.full_name,
          whatsapp_number: customer.whatsapp_number,
          email: customer.email,
          gst_number: customer.gst_number,
        },
        summary: {
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          total_due: totalDue,
          total_invoices: rawInvoices.length,
          paid_count: paidCount,
          partial_count: partialCount,
          unpaid_count: unpaidCount,
        },
        ledger_entries: ledgerEntries,
      },
    });
  } catch (error) {
    console.error("Get customer ledger error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customer ledger" });
  }
};
