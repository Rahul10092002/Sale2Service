import mongoose from "mongoose";
import InvoiceItem from "../models/InvoiceItem.js";
import ProductMaster from "../models/ProductMaster.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import Invoice from "../models/Invoice.js";

export default class ProductController {
  // Create product (invoice item)
  async createProduct(req, res) {
    try {
      const { user } = req;
      const payload = req.body;

      if (!payload.serial_number || !payload.product_name) {
        return res.status(400).json({
          success: false,
          message: "serial_number and product_name are required",
        });
      }

      // ensure uniqueness per shop is handled by model/indexes; still check
      const exists = await InvoiceItem.findOne({
        serial_number: payload.serial_number.toUpperCase(),
        shop_id: user.shopId,
        deleted_at: null,
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Product with this serial number already exists",
        });
      }

      const product = new InvoiceItem({
        ...payload,
        serial_number: payload.serial_number.toUpperCase(),
        shop_id: user.shopId,
      });

      await product.save();

      res.status(201).json({ success: true, data: { product } });
    } catch (error) {
      console.error("Create product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create product" });
    }
  }

  // List products with pagination and search
  async getProducts(req, res) {
    try {
      const { user } = req;
      const {
        page = 1,
        limit = 10,
        search,
        serial_number,
        product_name,
        company,
        status,
        product_category,
        has_service_plan, // 'yes' | 'no'
        service_due_days, // '7' | '14' | '30' | '60' | '90'
        warranty_status, // 'expired' | '30' | '60' | '90' | '180'
        payment_status, // 'PAID' | 'PARTIAL' | 'UNPAID'
      } = req.query;

      const query = { shop_id: user.shopId, deleted_at: null };

      if (serial_number) query.serial_number = serial_number.toUpperCase();
      if (product_name)
        query.product_name = { $regex: product_name, $options: "i" };
      if (company) query.company = { $regex: company, $options: "i" };
      if (status) query.status = status;
      if (product_category) query.product_category = product_category;

      if (search) {
        query.$or = [
          { serial_number: { $regex: search, $options: "i" } },
          { product_name: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
          { model_number: { $regex: search, $options: "i" } },
        ];
      }

      // Warranty expiry filter
      if (warranty_status) {
        const now = new Date();
        if (warranty_status === "expired") {
          query.warranty_end_date = { $lt: now };
        } else {
          const days = parseInt(warranty_status);
          const future = new Date(now);
          future.setDate(future.getDate() + days);
          query.warranty_end_date = { $gte: now, $lte: future };
        }
      }

      // Filters that require cross-collection lookups — collect allowed product ID sets
      let allowedProductIds = null; // null = no restriction

      if (has_service_plan === "yes") {
        const ids = await ServicePlan.distinct("invoice_item_id", {
          shop_id: user.shopId,
          deleted_at: null,
        });
        allowedProductIds = ids;
      } else if (has_service_plan === "no") {
        const ids = await ServicePlan.distinct("invoice_item_id", {
          shop_id: user.shopId,
          deleted_at: null,
        });
        query._id = { $nin: ids };
      }

      if (service_due_days) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + parseInt(service_due_days));

        const planIds = await ServiceSchedule.distinct("service_plan_id", {
          scheduled_date: { $gte: now, $lte: future },
          status: { $in: ["PENDING", "RESCHEDULED"] },
        });

        const productIds = await ServicePlan.distinct("invoice_item_id", {
          _id: { $in: planIds },
          shop_id: user.shopId,
          deleted_at: null,
        });

        if (allowedProductIds !== null) {
          const allowed = new Set(productIds.map(String));
          allowedProductIds = allowedProductIds.filter((id) =>
            allowed.has(String(id)),
          );
        } else {
          allowedProductIds = productIds;
        }
      }

      if (allowedProductIds !== null) {
        query._id = { ...(query._id || {}), $in: allowedProductIds };
      }

      // Payment status filter — lookup invoices by payment_status
      if (payment_status) {
        const invoiceIds = await Invoice.distinct("_id", {
          shop_id: user.shopId,
          payment_status,
          deleted_at: null,
        });
        query.invoice_id = { $in: invoiceIds };
      }

      const skip = (page - 1) * parseInt(limit);

      const [products, total] = await Promise.all([
        InvoiceItem.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate({
            path: "invoice_id",
            select:
              "invoice_number invoice_date total_amount payment_status amount_paid amount_due",
            populate: {
              path: "customer_id",
              select: "full_name whatsapp_number address",
            },
          }),
        InvoiceItem.countDocuments(query),
      ]);

      // Get service plan data for each product
      const productsWithService = await Promise.all(
        products.map(async (product) => {
          try {
            // Find service plan for this product
            const servicePlan = await ServicePlan.findOne({
              invoice_item_id: product._id,
              deleted_at: null,
            });

            const invoice = product.invoice_id;
            const invoiceData = invoice
              ? {
                  _id: invoice._id,
                  invoice_number: invoice.invoice_number,
                  invoice_date: invoice.invoice_date,
                  total_amount: invoice.total_amount,
                  payment_status: invoice.payment_status,
                  amount_paid: invoice.amount_paid,
                  amount_due: invoice.amount_due,
                }
              : null;

            const customerData = invoice?.customer_id
              ? {
                  _id: invoice.customer_id._id,
                  full_name: invoice.customer_id.full_name,
                  whatsapp_number: invoice.customer_id.whatsapp_number,
                  address: invoice.customer_id.address,
                }
              : null;

            if (!servicePlan) {
              return {
                ...product.toObject(),
                invoice_id: product.invoice_id?._id ?? product.invoice_id,
                invoice: invoiceData,
                customer: customerData,
                hasServicePlan: false,
                nextServiceDate: null,
              };
            }

            // Find next upcoming service schedule
            const nextSchedule = await ServiceSchedule.findOne({
              service_plan_id: servicePlan._id,
              scheduled_date: { $gte: new Date() },
              status: { $in: ["PENDING", "RESCHEDULED"] },
              deleted_at: null,
            }).sort({ scheduled_date: 1 });

            return {
              ...product.toObject(),
              invoice_id: product.invoice_id?._id ?? product.invoice_id,
              invoice: invoiceData,
              customer: customerData,
              hasServicePlan: true,
              servicePlan: {
                _id: servicePlan._id,
                service_interval_type: servicePlan.service_interval_type,
                service_interval_value: servicePlan.service_interval_value,
                total_services: servicePlan.total_services,
                service_charge: servicePlan.service_charge,
              },
              nextServiceDate: nextSchedule
                ? nextSchedule.scheduled_date
                : null,
            };
          } catch (error) {
            console.error(
              `Error getting service data for product ${product._id}:`,
              error,
            );
            return {
              ...product.toObject(),
              invoice_id: product.invoice_id?._id ?? product.invoice_id,
              invoice: null,
              customer: null,
              hasServicePlan: false,
              nextServiceDate: null,
            };
          }
        }),
      );

      res.json({
        success: true,
        data: {
          products: productsWithService,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get products error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch products" });
    }
  }

  // Get single product
  async getProductById(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;

      const product = await InvoiceItem.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      }).populate({
        path: "invoice_id",
        select:
          "invoice_number invoice_date total_amount payment_status amount_paid amount_due",
        populate: {
          path: "customer_id",
          select: "full_name whatsapp_number address email alternate_phone",
        },
      });

      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      const invoice = product.invoice_id;
      const invoiceData = invoice
        ? {
            _id: invoice._id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            total_amount: invoice.total_amount,
            payment_status: invoice.payment_status,
            amount_paid: invoice.amount_paid,
            amount_due: invoice.amount_due,
          }
        : null;

      const customerData = invoice?.customer_id
        ? {
            _id: invoice.customer_id._id,
            full_name: invoice.customer_id.full_name,
            whatsapp_number: invoice.customer_id.whatsapp_number,
            email: invoice.customer_id.email,
            alternate_phone: invoice.customer_id.alternate_phone,
            address: invoice.customer_id.address,
          }
        : null;

      // Fetch service plan and schedules
      const servicePlan = await ServicePlan.findOne({
        invoice_item_id: product._id,
        deleted_at: null,
      });

      const nextSchedule = servicePlan
        ? await ServiceSchedule.findOne({
            service_plan_id: servicePlan._id,
            scheduled_date: { $gte: new Date() },
            status: { $in: ["PENDING", "RESCHEDULED"] },
            deleted_at: null,
          }).sort({ scheduled_date: 1 })
        : null;

      res.json({
        success: true,
        data: {
          product: {
            ...product.toObject(),
            invoice_id: product.invoice_id?._id ?? product.invoice_id,
            invoice: invoiceData,
            customer: customerData,
            hasServicePlan: !!servicePlan,
            servicePlan: servicePlan
              ? {
                  _id: servicePlan._id,
                  service_interval_type: servicePlan.service_interval_type,
                  service_interval_value: servicePlan.service_interval_value,
                  total_services: servicePlan.total_services,
                  service_charge: servicePlan.service_charge,
                }
              : null,
            nextServiceDate: nextSchedule ? nextSchedule.scheduled_date : null,
          },
        },
      });
    } catch (error) {
      console.error("Get product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch product" });
    }
  }

  // Update product
  async updateProduct(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;
      const payload = req.body;

      const product = await InvoiceItem.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      if (payload.serial_number)
        product.serial_number = payload.serial_number.toUpperCase();
      Object.assign(product, payload);
      product.updated_at = new Date();

      await product.save();

      res.json({ success: true, data: { product } });
    } catch (error) {
      console.error("Update product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update product" });
    }
  }

  // Soft delete product
  async deleteProduct(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;

      const product = await InvoiceItem.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      product.deleted_at = new Date();
      await product.save();

      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete product" });
    }
  }

  // Autocomplete product names from InvoiceItem history + ProductMaster
  async autocomplete(req, res) {
    const { q = "", limit = "10" } = req.query;
    const shopId = req.user.shopId;

    if (!q.trim()) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const lim = Math.min(parseInt(limit) || 10, 20);
    const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQ, "i");
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    try {
      const [fromItems, fromMaster] = await Promise.all([
        InvoiceItem.aggregate([
          {
            $match: {
              shop_id: shopObjId,
              product_name: { $regex: escapedQ, $options: "i" },
              deleted_at: null,
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: { $toLower: "$product_name" },
              product_name: { $first: "$product_name" },
              product_category: { $first: "$product_category" },
              company: { $first: "$company" },
              model_number: { $first: "$model_number" },
              selling_price: { $first: "$selling_price" },
              capacity_rating: { $first: "$capacity_rating" },
              voltage: { $first: "$voltage" },
              warranty_type: { $first: "$warranty_type" },
              warranty_duration_months: { $first: "$warranty_duration_months" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: lim },
        ]),
        ProductMaster.find({ shop_id: shopObjId, product_name: regex })
          .select(
            "product_name product_category company model_number selling_price capacity_rating voltage warranty_type warranty_duration_months",
          )
          .limit(lim)
          .lean(),
      ]);

      const seen = new Set(fromItems.map((s) => s.product_name.toLowerCase()));
      const masterNew = fromMaster
        .filter((m) => !seen.has(m.product_name.toLowerCase()))
        .map((m) => ({ ...m, count: 0, source: "master" }));

      const suggestions = [
        ...fromItems.map((s) => ({ ...s, source: "history" })),
        ...masterNew,
      ].slice(0, lim);

      return res.json({ success: true, data: { suggestions } });
    } catch (error) {
      console.error("Autocomplete error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Autocomplete failed" });
    }
  }

  // Upsert a product master entry (creates if new, updates if exists)
  async saveMaster(req, res) {
    const { user } = req;
    const {
      product_name,
      product_category,
      company,
      model_number,
      selling_price,
      capacity_rating,
      voltage,
      warranty_type,
      warranty_duration_months,
    } = req.body;

    if (!product_name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "product_name is required" });
    }

    const shopId = user.shopId;
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.json({ success: true });
    }
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    try {
      const setFields = {
        product_name: product_name.trim(),
        shop_id: shopObjId,
        auto_saved: true,
      };
      if (product_category) setFields.product_category = product_category;
      if (company) setFields.company = company;
      if (model_number) setFields.model_number = model_number;
      if (selling_price != null && selling_price > 0)
        setFields.selling_price = selling_price;
      if (capacity_rating) setFields.capacity_rating = capacity_rating;
      if (voltage) setFields.voltage = voltage;
      if (warranty_type) setFields.warranty_type = warranty_type;
      if (warranty_duration_months != null && warranty_duration_months > 0)
        setFields.warranty_duration_months = warranty_duration_months;

      await ProductMaster.findOneAndUpdate(
        { product_name: product_name.trim(), shop_id: shopObjId },
        { $set: setFields },
        { upsert: true, new: true },
      );

      return res.json({ success: true });
    } catch (error) {
      if (error.code === 11000) return res.json({ success: true });
      console.error("Save master error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to save product master" });
    }
  }
}
