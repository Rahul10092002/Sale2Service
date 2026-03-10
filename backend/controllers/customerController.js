import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";

export default class CustomerController {
  // Create a new customer
  async createCustomer(req, res) {
    try {
      const { user } = req;
      const payload = req.body;

      // Minimal validation
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
  }

  // Get customers list (pagination + search)
  async getCustomers(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 10, search } = req.query;

      const query = { shop_id: user.shopId, deleted_at: null };

      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { whatsapp_number: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * parseInt(limit);

      const [customers, total] = await Promise.all([
        Customer.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Customer.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          customers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get customers error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch customers" });
    }
  }

  // Get single customer by ID and their invoices
  async getCustomerById(req, res) {
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
  }

  // Update customer
  async updateCustomer(req, res) {
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

      Object.assign(customer, payload);
      customer.updated_at = new Date();
      await customer.save();

      res.json({ success: true, data: { customer } });
    } catch (error) {
      console.error("Update customer error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update customer" });
    }
  }

  // Soft delete customer
  async deleteCustomer(req, res) {
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
  }
}
