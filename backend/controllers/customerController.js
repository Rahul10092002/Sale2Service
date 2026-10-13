import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServiceVisit from "../models/ServiceVisit.js";
import Shop from "../models/Shop.js";
import ReminderLog from "../models/ReminderLog.js";

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

    let cleanPhone = String(payload.whatsapp_number).replace(/[^\d]/g, "").trim();
    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.substring(1);
    }

    const existing = await Customer.findOne({
      whatsapp_number: { $in: [cleanPhone, `91${cleanPhone}`, `+91${cleanPhone}`] },
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
      whatsapp_number: cleanPhone,
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
    const { page = 1, limit = 25, search, sort = "name_asc", financial_status } = req.query;

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
    } else if (sort === "dues_desc") {
      sortStage = { total_due: -1, full_name: 1 };
    } else if (sort === "dues_asc") {
      sortStage = { total_due: 1, full_name: 1 };
    } else if (sort === "credit_desc") {
      sortStage = { total_due: 1, advance_balance: -1, full_name: 1 };
    } else if (sort === "invoiced_desc") {
      sortStage = { total_invoiced: -1, full_name: 1 };
    } else if (sort === "paid_desc") {
      sortStage = { total_paid: -1, full_name: 1 };
    }

    const hasFinancialFilter = financial_status && financial_status !== "all";
    const hasFinancialSort =
      sort &&
      (sort.startsWith("dues") ||
        sort.startsWith("credit") ||
        sort.startsWith("invoiced") ||
        sort.startsWith("paid"));

    const lookupInvoiceSummary = {
      $lookup: {
        from: "invoices",
        let: { customerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$customer_id", "$$customerId"] },
                  { $eq: ["$shop_id", new mongoose.Types.ObjectId(user.shopId)] },
                  { $eq: ["$deleted_at", null] },
                ],
              },
            },
          },
          {
            $project: {
              total_amount: { $ifNull: ["$total_amount", 0] },
              amount_paid: { $ifNull: ["$amount_paid", 0] },
              excess_exchange_credit: { $ifNull: ["$excess_exchange_credit", 0] },
            },
          },
        ],
        as: "invoices_summary",
      },
    };

    const addFinancialFields = {
      $addFields: {
        total_invoiced: { $sum: "$invoices_summary.total_amount" },
        total_paid: { $sum: "$invoices_summary.amount_paid" },
        total_exchange_credit: {
          $sum: { $ifNull: ["$invoices_summary.excess_exchange_credit", 0] },
        },
        advance_balance: { $ifNull: ["$advance_balance", 0] },
        total_due: {
          $subtract: [
            { $sum: "$invoices_summary.total_amount" },
            {
              $add: [
                { $sum: "$invoices_summary.amount_paid" },
                {
                  $sum: {
                    $ifNull: ["$invoices_summary.excess_exchange_credit", 0],
                  },
                },
                { $ifNull: ["$advance_balance", 0] },
              ],
            },
          ],
        },
        total_invoices: { $size: "$invoices_summary" },
      },
    };

    let result;

    if (hasFinancialFilter || hasFinancialSort) {
      const filterPipeline = [
        { $match: matchQuery },
        lookupInvoiceSummary,
        addFinancialFields,
        { $project: { invoices_summary: 0 } },
      ];

      if (financial_status === "dues" || financial_status === "pending") {
        filterPipeline.push({ $match: { total_due: { $gt: 0 } } });
        if (!sort || sort === "name_asc") {
          sortStage = { total_due: -1, full_name: 1 };
        }
      } else if (financial_status === "credit" || financial_status === "advance") {
        filterPipeline.push({
          $match: {
            $or: [{ total_due: { $lt: 0 } }, { advance_balance: { $gt: 0 } }],
          },
        });
        if (!sort || sort === "name_asc") {
          sortStage = { total_due: 1, advance_balance: -1, full_name: 1 };
        }
      } else if (financial_status === "invoiced") {
        filterPipeline.push({ $match: { total_invoices: { $gt: 0 } } });
      } else if (financial_status === "collected" || financial_status === "paid") {
        filterPipeline.push({ $match: { total_paid: { $gt: 0 } } });
      } else if (financial_status === "settled") {
        filterPipeline.push({
          $match: {
            total_invoices: { $gt: 0 },
            total_due: { $eq: 0 },
          },
        });
      }

      filterPipeline.push({
        $facet: {
          metadata: [{ $count: "total" }],
          customers: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limitNum },
          ],
        },
      });

      result = await Customer.aggregate(filterPipeline);
    } else {
      result = await Customer.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            customers: [
              { $sort: sortStage },
              { $skip: skip },
              { $limit: limitNum },
              lookupInvoiceSummary,
              addFinancialFields,
              { $project: { invoices_summary: 0 } },
            ],
          },
        },
      ]);
    }

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

    const advanceBalance = Number(customer.advance_balance || 0);
    const totalDue = cumulativeBalance - advanceBalance;

    if (advanceBalance > 0) {
      ledgerEntries.push({
        _id: `adv_${customer._id}`,
        invoice_number: "ADVANCE-CREDIT",
        invoice_date: customer.updatedAt || new Date(),
        payment_mode: "ADVANCE",
        payment_status: "PAID",
        items_summary: "Customer Advance Payment / Store Credit Balance",
        debit: 0,
        credit: advanceBalance,
        amount_paid: advanceBalance,
        excess_exchange_credit: 0,
        invoice_balance: -advanceBalance,
        running_balance: totalDue,
        is_advance: true,
      });
    }

    res.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          full_name: customer.full_name,
          whatsapp_number: customer.whatsapp_number,
          email: customer.email,
          gst_number: customer.gst_number,
          advance_balance: advanceBalance,
          advance_history: customer.advance_history || [],
        },
        summary: {
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          total_exchange_credit: totalExchangeCredit,
          advance_balance: advanceBalance,
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
      payment_method: rawMethod,
      payment_mode: rawMode,
      payment_date = new Date(),
      notes = "",
      send_whatsapp = true,
    } = req.body;
    const payment_method = rawMethod || rawMode || "CASH";

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
      customer.advance_balance = Number(customer.advance_balance || 0) + numAmount;
      customer.advance_history = customer.advance_history || [];
      customer.advance_history.push({
        amount: numAmount,
        type: "CREDIT",
        payment_method,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        notes: notes || "Direct advance payment (no pending dues)",
        recorded_by: user.userId,
      });
      await customer.save();

      // Send WhatsApp notification if enabled
      if (send_whatsapp && customer.whatsapp_number) {
        const { formatPhoneNumber, isValidWhatsAppNumber, formatDateForMessage } = await import("../scheduler/core/utils.js");
        const { sendWhatsappMessageViaMSG91 } = await import("../config/msg91.js");
        const formattedPhone = formatPhoneNumber(customer.whatsapp_number);
        if (formattedPhone && isValidWhatsAppNumber(formattedPhone)) {
          try {
            const templateVars = {
              1: numAmount.toFixed(2),
              2: "ADVANCE CREDIT",
              3: formatDateForMessage(payment_date ? new Date(payment_date) : new Date()),
              4: shop.shop_name_hi || shop.shop_name || "",
            };

            await sendWhatsappMessageViaMSG91({
              templateName: "payment_received",
              to: formattedPhone,
              components: templateVars,
              campaignName: "payment_received",
              hospitalId: shop._id,
              userName: customer.full_name || "",
              messageType: "payment_received",
            });
          } catch (waErr) {
            console.error("Failed to send WhatsApp advance payment notification:", waErr);
          }
        }
      }

      return res.json({
        success: true,
        message: `Customer has no pending dues. ₹${numAmount.toLocaleString("en-IN")} credited to customer advance balance.`,
        data: {
          total_received: numAmount,
          total_applied: 0,
          excess_balance: numAmount,
          advance_balance: customer.advance_balance,
          updated_invoices: [],
        },
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
      // Send WhatsApp payment_received template for each updated invoice if enabled
      if (send_whatsapp && customer.whatsapp_number) {
        const formattedPhone = formatPhoneNumber(customer.whatsapp_number);
        if (formattedPhone && isValidWhatsAppNumber(formattedPhone)) {
          try {
            const templateVars = {
              1: paymentForThisInv.toFixed(2),
              2: inv.invoice_number || "N/A",
              3: formatDateForMessage(payment_date ? new Date(payment_date) : new Date()),
              4: shop.shop_name_hi || shop.shop_name || "",
            };

            const msgConfig = {
              templateName: "payment_received",
              to: formattedPhone,
              components: templateVars,
              campaignName: "payment_received",
              hospitalId: shop._id,
              userName: customer.full_name || "",
              messageType: "payment_received",
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

    let advanceCredited = 0;
    if (remainingPayment > 0) {
      advanceCredited = remainingPayment;
      customer.advance_balance = Number(customer.advance_balance || 0) + remainingPayment;
      customer.advance_history = customer.advance_history || [];
      customer.advance_history.push({
        amount: remainingPayment,
        type: "CREDIT",
        payment_method,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        notes: notes || "Excess payment credited to customer advance",
        recorded_by: user.userId,
      });
      await customer.save();
    }

    let summaryMsg = `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded across ${updatedInvoices.length} invoice(s)`;
    if (advanceCredited > 0) {
      summaryMsg += ` and ₹${advanceCredited.toLocaleString("en-IN")} credited to advance balance`;
    }

    return res.json({
      success: true,
      message: summaryMsg,
      data: {
        total_received: numAmount,
        total_applied: numAmount - remainingPayment,
        excess_balance: advanceCredited,
        advance_balance: customer.advance_balance || 0,
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

// Merge duplicate customers into a single primary customer
export const mergeCustomers = async (req, res) => {
  try {
    const { user } = req;
    const { primaryCustomerId, duplicateCustomerIds, updateFields = {} } = req.body;

    if (!primaryCustomerId || !Array.isArray(duplicateCustomerIds) || duplicateCustomerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "primaryCustomerId and duplicateCustomerIds array are required",
      });
    }

    // Find primary customer
    const primaryCustomer = await Customer.findOne({
      _id: primaryCustomerId,
      shop_id: user.shopId,
      deleted_at: null,
    });

    if (!primaryCustomer) {
      return res.status(404).json({
        success: false,
        message: "Primary customer not found",
      });
    }

    // Filter duplicate customer IDs to prevent merging with primary itself
    const filteredDuplicateIds = duplicateCustomerIds.filter(
      (id) => id.toString() !== primaryCustomerId.toString()
    );

    if (filteredDuplicateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid duplicate customer IDs provided",
      });
    }

    const duplicates = await Customer.find({
      _id: { $in: filteredDuplicateIds },
      shop_id: user.shopId,
    });

    if (duplicates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching duplicate customers found",
      });
    }

    const duplicateObjectIds = duplicates.map((d) => d._id);
    const duplicateCustomerIdStrings = duplicates
      .map((d) => d.customer_id)
      .filter(Boolean);

    // 1. Relink all invoices to primary customer
    const invoiceUpdate = await Invoice.updateMany(
      { customer_id: { $in: duplicateObjectIds }, shop_id: user.shopId },
      { $set: { customer_id: primaryCustomer._id } }
    );

    // 2. Relink ReminderLogs
    const allDuplicateRefStrings = [
      ...duplicateObjectIds.map((id) => id.toString()),
      ...duplicateCustomerIdStrings,
    ];

    await ReminderLog.updateMany(
      {
        entity_id: { $in: allDuplicateRefStrings },
        shop_id: user.shopId,
        entity_type: "CUSTOMER",
      },
      {
        $set: {
          entity_id: primaryCustomer.customer_id,
          recipient_name: primaryCustomer.full_name,
        },
      }
    );

    // 3. Update primary customer with any provided overrides (e.g. name, address, phone)
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
    ];

    ALLOWED_FIELDS.forEach((field) => {
      if (updateFields[field] !== undefined) {
        primaryCustomer[field] = updateFields[field];
      }
    });

    primaryCustomer.updated_at = new Date();
    await primaryCustomer.save();

    // 4. Soft delete duplicates
    const deleteDate = new Date();
    await Customer.updateMany(
      { _id: { $in: duplicateObjectIds }, shop_id: user.shopId },
      {
        $set: {
          deleted_at: deleteDate,
          notes: `Merged into customer ${primaryCustomer._id} on ${deleteDate.toISOString()}`,
        },
      }
    );

    res.json({
      success: true,
      message: `Successfully merged ${duplicates.length} customer(s) into ${primaryCustomer.full_name}`,
      data: {
        primary_customer: primaryCustomer,
        merged_count: duplicates.length,
        invoices_relinked: invoiceUpdate.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Merge customers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to merge customers",
      error: error.message,
    });
  }
};

/**
 * Calculate overall financial ledger summary across all customers for a given shop
 * @param {string|mongoose.Types.ObjectId} shopId
 * @returns {Promise<Object>}
 */
export const calculateCustomersLedgerSummary = async (shopId) => {
  const shopObjectId =
    shopId instanceof mongoose.Types.ObjectId
      ? shopId
      : new mongoose.Types.ObjectId(shopId);

  const result = await Customer.aggregate([
    {
      $match: {
        shop_id: shopObjectId,
        deleted_at: null,
      },
    },
    {
      $lookup: {
        from: "invoices",
        let: { custId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$customer_id", "$$custId"] },
                  { $eq: ["$shop_id", shopObjectId] },
                  { $eq: ["$deleted_at", null] },
                ],
              },
            },
          },
          {
            $project: {
              total_amount: { $ifNull: ["$total_amount", 0] },
              amount_paid: { $ifNull: ["$amount_paid", 0] },
              excess_exchange_credit: { $ifNull: ["$excess_exchange_credit", 0] },
            },
          },
        ],
        as: "invoices",
      },
    },
    {
      $project: {
        total_invoiced: { $sum: "$invoices.total_amount" },
        total_paid: { $sum: "$invoices.amount_paid" },
        total_exchange_credit: { $sum: "$invoices.excess_exchange_credit" },
        advance_balance: { $ifNull: ["$advance_balance", 0] },
        has_invoices: { $gt: [{ $size: "$invoices" }, 0] },
        balance: {
          $subtract: [
            { $sum: "$invoices.total_amount" },
            {
              $add: [
                { $sum: "$invoices.amount_paid" },
                { $sum: "$invoices.excess_exchange_credit" },
                { $ifNull: ["$advance_balance", 0] },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalPendingAmount: {
          $sum: { $cond: [{ $gt: ["$balance", 0] }, "$balance", 0] },
        },
        customersWithDues: {
          $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] },
        },
        totalStoreCredit: {
          $sum: { $cond: [{ $lt: ["$balance", 0] }, { $abs: "$balance" }, 0] },
        },
        customersWithCredit: {
          $sum: { $cond: [{ $lt: ["$balance", 0] }, 1, 0] },
        },
        totalAdvanceBalance: {
          $sum: "$advance_balance",
        },
        netReceivable: { $sum: "$balance" },
        totalInvoiced: { $sum: "$total_invoiced" },
        totalPaid: { $sum: "$total_paid" },
        totalExchangeCredit: { $sum: "$total_exchange_credit" },
        customersWithInvoices: {
          $sum: { $cond: ["$has_invoices", 1, 0] },
        },
      },
    },
  ]);

  const summary = result[0] || {
    totalPendingAmount: 0,
    customersWithDues: 0,
    totalStoreCredit: 0,
    customersWithCredit: 0,
    totalAdvanceBalance: 0,
    netReceivable: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalExchangeCredit: 0,
    customersWithInvoices: 0,
  };

  return {
    totalPendingAmount: Math.round((summary.totalPendingAmount || 0) * 100) / 100,
    customersWithDues: summary.customersWithDues || 0,
    totalStoreCredit: Math.round((summary.totalStoreCredit || 0) * 100) / 100,
    customersWithCredit: summary.customersWithCredit || 0,
    totalAdvanceBalance: Math.round((summary.totalAdvanceBalance || 0) * 100) / 100,
    netReceivable: Math.round((summary.netReceivable || 0) * 100) / 100,
    totalInvoiced: Math.round((summary.totalInvoiced || 0) * 100) / 100,
    totalPaid: Math.round((summary.totalPaid || 0) * 100) / 100,
    totalExchangeCredit: Math.round((summary.totalExchangeCredit || 0) * 100) / 100,
    customersWithInvoices: summary.customersWithInvoices || 0,
  };
};

/**
 * Endpoint controller to fetch overall customer ledger stats
 * GET /api/customers/ledger-summary
 */
export const getAllCustomersLedgerSummary = async (req, res) => {
  try {
    const { user } = req;
    const summary = await calculateCustomersLedgerSummary(user.shopId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get all customers ledger summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger summary",
      error: error.message,
    });
  }
};


