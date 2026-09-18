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
