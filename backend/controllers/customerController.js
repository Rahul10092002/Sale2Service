import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServiceVisit from "../models/ServiceVisit.js";
import Shop from "../models/Shop.js";

// Create a new customer
export const createCustomer = async (req, res) => {
  try {
    const { user } = req;
    const payload = req.body;

    if ((!payload.first_name && !payload.full_name) || !payload.whatsapp_number) {
      return res.status(400).json({
        success: false,
        message: "Customer name and whatsapp_number are required",
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
        { first_name: regex },
        { last_name: regex },
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
                total_exchange_credit: { $sum: { $ifNull: ["$invoices_summary.excess_exchange_credit", 0] } },
                total_due: {
                  $subtract: [
                    { $sum: "$invoices_summary.total_amount" },
                    {
                      $add: [
                        { $sum: "$invoices_summary.amount_paid" },
                        { $sum: { $ifNull: ["$invoices_summary.excess_exchange_credit", 0] } },
                      ],
                    },
                  ],
                },
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
      "first_name",
      "last_name",
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

    const deleteDate = new Date();
    customer.deleted_at = deleteDate;
    await customer.save();

    // Cascade soft delete associated invoices and details
    const customerInvoices = await Invoice.find({
      customer_id: customer._id,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (customerInvoices.length > 0) {
      const invoiceIds = customerInvoices.map((inv) => inv._id);

      // Soft delete invoices
      await Invoice.updateMany(
        { _id: { $in: invoiceIds }, shop_id: user.shopId },
        { deleted_at: deleteDate }
      );

      // Find associated invoice items
      const invoiceItems = await InvoiceItem.find({
        invoice_id: { $in: invoiceIds },
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (invoiceItems.length > 0) {
        const itemIds = invoiceItems.map((item) => item._id);

        // Soft delete invoice items
        await InvoiceItem.updateMany(
          { _id: { $in: itemIds }, shop_id: user.shopId },
          { deleted_at: deleteDate }
        );

        // Find associated service plans
        const servicePlans = await ServicePlan.find({
          invoice_item_id: { $in: itemIds },
          shop_id: user.shopId,
          deleted_at: null,
        });

        if (servicePlans.length > 0) {
          const planIds = servicePlans.map((plan) => plan._id);

          // Soft delete service plans
          await ServicePlan.updateMany(
            { _id: { $in: planIds }, shop_id: user.shopId },
            { deleted_at: deleteDate }
          );

          // Find associated service schedules
          const serviceSchedules = await ServiceSchedule.find({
            service_plan_id: { $in: planIds },
            shop_id: user.shopId,
            deleted_at: null,
          });

          if (serviceSchedules.length > 0) {
            const scheduleIds = serviceSchedules.map((sch) => sch._id);

            // Soft delete service schedules
            await ServiceSchedule.updateMany(
              { _id: { $in: scheduleIds }, shop_id: user.shopId },
              { deleted_at: deleteDate }
            );

            // Soft delete service visits
            await ServiceVisit.updateMany(
              {
                service_schedule_id: { $in: scheduleIds },
                shop_id: user.shopId,
                deleted_at: null,
              },
              { deleted_at: deleteDate }
            );
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Customer and associated invoices and details deleted successfully",
    });
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
    let totalExchangeCredit = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const ledgerEntries = rawInvoices.map((inv) => {
      const debit = Number(inv.total_amount || 0);
      const amountPaid = Number(inv.amount_paid || 0);
      const excessCredit = Number(inv.excess_exchange_credit || 0);
      const credit = amountPaid + excessCredit;
      const netBalance = debit - credit;

      cumulativeBalance += netBalance;
      totalInvoiced += debit;
      totalPaid += amountPaid;
      totalExchangeCredit += excessCredit;

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
        amount_paid: amountPaid,
        excess_exchange_credit: excessCredit,
        invoice_balance: netBalance,
        running_balance: cumulativeBalance,
      };
    });

    const totalDue = cumulativeBalance;

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
          total_exchange_credit: totalExchangeCredit,
          total_due: totalDue,
          store_credit_balance: totalDue < 0 ? Math.abs(totalDue) : 0,
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

// Record bulk payment for customer across unpaid invoices (FIFO)
export const recordCustomerPayment = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const {
      amount,
      payment_method = "CASH",
      payment_date = new Date(),
      notes = "",
      send_whatsapp = true,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      return res.status(400).json({
        success: false,
        message: "Valid positive payment amount is required",
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const shop = await Shop.findById(user.shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // Fetch unpaid or partially paid invoices sorted by oldest invoice_date first (FIFO)
    const unpaidInvoices = await Invoice.find({
      customer_id: id,
      shop_id: user.shopId,
      deleted_at: null,
      payment_status: { $in: ["UNPAID", "PARTIAL"] },
    }).sort({ invoice_date: 1, createdAt: 1 });

    if (unpaidInvoices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer has no unpaid or partially paid invoices",
      });
    }

    let remainingPayment = numAmount;
    const updatedInvoices = [];
    const { formatPhoneNumber, isValidWhatsAppNumber, formatDateForMessage } = await import("../scheduler/core/utils.js");
    const { sendWhatsappMessageViaMSG91 } = await import("../config/msg91.js");

    for (const inv of unpaidInvoices) {
      if (remainingPayment <= 0) break;

      const currentPaid = Number(inv.amount_paid || 0);
      const excessCredit = Number(inv.excess_exchange_credit || 0);
      const netDue = Number(inv.total_amount || 0) - (currentPaid + excessCredit);

      if (netDue <= 0) continue;

      const paymentForThisInv = Math.min(remainingPayment, netDue);
      const newAmountPaid = currentPaid + paymentForThisInv;
      const newAmountDue = Math.max(0, Number(inv.total_amount || 0) - (newAmountPaid + excessCredit));
      const newStatus = newAmountDue === 0 ? "PAID" : "PARTIAL";

      // Add payment log to invoice
      inv.payments = inv.payments || [];
      inv.payments.push({
        amount: paymentForThisInv,
        payment_method,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        notes: notes || "Lump sum customer ledger payment",
        recorded_by: user.userId,
      });

      inv.amount_paid = newAmountPaid;
      inv.amount_due = newAmountDue;
      inv.payment_status = newStatus;
      inv.payment_mode = payment_method;

      await inv.save();
      remainingPayment -= paymentForThisInv;

      let whatsappSent = false;
      // Send WhatsApp payment receipt/status template for each updated invoice if enabled
      if (send_whatsapp && customer.whatsapp_number) {
        const formattedPhone = formatPhoneNumber(customer.whatsapp_number);
        if (formattedPhone && isValidWhatsAppNumber(formattedPhone)) {
          try {
            const shopContact = formatPhoneNumber(shop?.phone) || formattedPhone;
            const templateVars = {
              1: customer.full_name || "Customer",
              2: typeof newAmountDue === "number" ? newAmountDue.toFixed(2) : String(newAmountDue),
              3: inv.invoice_number || "N/A",
              4: inv.invoice_items?.[0]?.serial_number || "N/A",
              5: formatDateForMessage(inv.due_date || new Date()),
              6: shopContact,
              7: shop.shop_name_hi || shop.shop_name || "WarrantyDesk",
            };

            const msgConfig = {
              templateName: "payment_reminders",
              to: formattedPhone,
              components: templateVars,
              buttons: [{ subtype: "url", value: shopContact }],
              campaignName: "payment_receipt",
              hospitalId: shop._id,
              userName: customer.full_name || "",
              messageType: "payment_receipt",
            };

            const waResp = await sendWhatsappMessageViaMSG91(msgConfig);
            if (waResp) whatsappSent = true;
          } catch (waErr) {
            console.error(`Failed to send WhatsApp payment notification for invoice ${inv.invoice_number}:`, waErr);
          }
        }
      }

      updatedInvoices.push({
        invoice_id: inv._id,
        invoice_number: inv.invoice_number,
        amount_applied: paymentForThisInv,
        remaining_due: newAmountDue,
        payment_status: newStatus,
        whatsapp_sent: whatsappSent,
      });
    }

    return res.json({
      success: true,
      message: `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded across ${updatedInvoices.length} invoice(s)`,
      data: {
        total_received: numAmount,
        total_applied: numAmount - remainingPayment,
        excess_balance: remainingPayment > 0 ? remainingPayment : 0,
        updated_invoices: updatedInvoices,
      },
    });
  } catch (error) {
    console.error("Record customer payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record customer payment",
      error: error.message,
    });
  }
};
