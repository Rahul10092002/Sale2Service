import mongoose from "mongoose";
import InvoiceItem from "../models/InvoiceItem.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import Invoice from "../models/Invoice.js";
import { BaseController } from "./baseController.js";

export default class ProductController extends BaseController {
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

  // List products with pagination, filters and search using MongoDB Aggregation Pipeline
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

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
      const skip = (pageNum - 1) * limitNum;
      const shopObjectId = new mongoose.Types.ObjectId(user.shopId);

      const matchQuery = {
        shop_id: shopObjectId,
        deleted_at: null,
      };

      if (serial_number) matchQuery.serial_number = serial_number.toUpperCase();
      if (product_name) matchQuery.product_name = { $regex: product_name, $options: "i" };
      if (company) matchQuery.company = { $regex: company, $options: "i" };
      if (status) matchQuery.status = status;
      if (product_category) matchQuery.product_category = product_category;

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        matchQuery.$or = [
          { serial_number: regex },
          { product_name: regex },
          { company: regex },
          { model_number: regex },
        ];
      }

      // Warranty expiry filter
      if (warranty_status) {
        const now = new Date();
        if (warranty_status === "expired") {
          matchQuery.warranty_end_date = { $lt: now };
        } else {
          const days = parseInt(warranty_status, 10);
          if (!isNaN(days)) {
            const future = new Date(now);
            future.setDate(future.getDate() + days);
            matchQuery.warranty_end_date = { $gte: now, $lte: future };
          }
        }
      }

      // Cross-collection filter optimization
      if (has_service_plan === "yes") {
        const ids = await ServicePlan.distinct("invoice_item_id", {
          shop_id: shopObjectId,
          deleted_at: null,
        });
        matchQuery._id = { ...(matchQuery._id || {}), $in: ids };
      } else if (has_service_plan === "no") {
        const ids = await ServicePlan.distinct("invoice_item_id", {
          shop_id: shopObjectId,
          deleted_at: null,
        });
        matchQuery._id = { ...(matchQuery._id || {}), $nin: ids };
      }

      if (service_due_days) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + parseInt(service_due_days, 10));

        const planIds = await ServiceSchedule.distinct("service_plan_id", {
          scheduled_date: { $gte: now, $lte: future },
          status: { $in: ["PENDING", "RESCHEDULED"] },
          deleted_at: null,
        });

        const productIds = await ServicePlan.distinct("invoice_item_id", {
          _id: { $in: planIds },
          shop_id: shopObjectId,
          deleted_at: null,
        });

        if (matchQuery._id?.$in) {
          const existingAllowed = new Set(matchQuery._id.$in.map(String));
          matchQuery._id.$in = productIds.filter((id) => existingAllowed.has(String(id)));
        } else {
          matchQuery._id = { ...(matchQuery._id || {}), $in: productIds };
        }
      }

      if (payment_status) {
        const invoiceIds = await Invoice.distinct("_id", {
          shop_id: shopObjectId,
          payment_status,
          deleted_at: null,
        });
        matchQuery.invoice_id = { $in: invoiceIds };
      }

      const now = new Date();

      // Execute high-performance aggregation pipeline with single-pass facet
      const pipelineResult = await InvoiceItem.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            products: [
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limitNum },
              // Lookup invoice details
              {
                $lookup: {
                  from: "invoices",
                  localField: "invoice_id",
                  foreignField: "_id",
                  as: "invoice_doc",
                },
              },
              { $unwind: { path: "$invoice_doc", preserveNullAndEmptyArrays: true } },
              // Lookup customer details via invoice
              {
                $lookup: {
                  from: "customers",
                  localField: "invoice_doc.customer_id",
                  foreignField: "_id",
                  as: "customer_doc",
                },
              },
              { $unwind: { path: "$customer_doc", preserveNullAndEmptyArrays: true } },
              // Lookup service plan for this product
              {
                $lookup: {
                  from: "serviceplans",
                  let: { itemId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$invoice_item_id", "$$itemId"] },
                            { $eq: ["$deleted_at", null] },
                          ],
                        },
                      },
                    },
                    { $limit: 1 },
                  ],
                  as: "service_plan_doc",
                },
              },
              { $unwind: { path: "$service_plan_doc", preserveNullAndEmptyArrays: true } },
              // Lookup next scheduled service for this plan
              {
                $lookup: {
                  from: "serviceschedules",
                  let: { planId: "$service_plan_doc._id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$service_plan_id", "$$planId"] },
                            { $gte: ["$scheduled_date", now] },
                            { $in: ["$status", ["PENDING", "RESCHEDULED"]] },
                            { $eq: ["$deleted_at", null] },
                          ],
                        },
                      },
                    },
                    { $sort: { scheduled_date: 1 } },
                    { $limit: 1 },
                  ],
                  as: "next_schedule_doc",
                },
              },
              { $unwind: { path: "$next_schedule_doc", preserveNullAndEmptyArrays: true } },
            ],
          },
        },
      ]);

      const total = pipelineResult[0]?.metadata[0]?.total || 0;
      const rawProducts = pipelineResult[0]?.products || [];

      // Format products with exact backwards compatibility
      const productsWithService = rawProducts.map((p) => {
        const invoiceData = p.invoice_doc
          ? {
              _id: p.invoice_doc._id,
              invoice_number: p.invoice_doc.invoice_number,
              invoice_date: p.invoice_doc.invoice_date,
              total_amount: p.invoice_doc.total_amount,
              payment_status: p.invoice_doc.payment_status,
              amount_paid: p.invoice_doc.amount_paid,
              amount_due: p.invoice_doc.amount_due,
            }
          : null;

        const customerData = p.customer_doc
          ? {
              _id: p.customer_doc._id,
              full_name: p.customer_doc.full_name,
              whatsapp_number: p.customer_doc.whatsapp_number,
              address: p.customer_doc.address,
            }
          : null;

        const servicePlan = p.service_plan_doc;
        const nextSchedule = p.next_schedule_doc;

        const {
          invoice_doc,
          customer_doc,
          service_plan_doc,
          next_schedule_doc,
          ...productFields
        } = p;

        return {
          ...productFields,
          invoice_id: p.invoice_id?._id ?? p.invoice_id,
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
            : undefined,
          nextServiceDate: nextSchedule ? nextSchedule.scheduled_date : null,
        };
      });

      res.json({
        success: true,
        data: {
          products: productsWithService,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1,
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

      if (payload.serial_number) {
        const newSerial = payload.serial_number.trim().toUpperCase();
        if (product.serial_number && product.serial_number !== newSerial) {
          const existingProduct = await InvoiceItem.findOne({
            shop_id: user.shopId,
            serial_number: newSerial,
            _id: { $ne: id },
            deleted_at: null,
          });

          if (existingProduct) {
            return res.status(400).json({
              success: false,
              message: `Serial number '${newSerial}' is already in use by another product in your shop`,
            });
          }

          const oldSerial = product.serial_number;
          const replacementDate = new Date();
          product.previous_serial_number = oldSerial;
          product.is_serial_replaced = true;
          product.replacement_date = replacementDate;
          if (payload.replacement_reason) {
            product.replacement_reason = payload.replacement_reason.trim();
          }
          if (!product.replacement_history) {
            product.replacement_history = [];
          }
          product.replacement_history.push({
            previous_serial_number: oldSerial,
            new_serial_number: newSerial,
            replacement_date: replacementDate,
            replacement_reason:
              payload.replacement_reason || "Updated via product edit",
          });
        }
        product.serial_number = newSerial;
      }

      Object.assign(product, payload);
      product.updated_at = new Date();

      await product.save();

      res.json({ success: true, data: { product } });
    } catch (error) {
      console.error("Update product error:", error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Serial number already exists in system",
        });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to update product" });
    }
  }

  // Replace product serial number during warranty
  async replaceSerialNumber(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;
      const { new_serial_number, replacement_reason = "" } = req.body;

      if (!new_serial_number || !new_serial_number.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "New serial number is required" });
      }

      const formattedNewSerial = new_serial_number.trim().toUpperCase();

      const product = await InvoiceItem.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (product.serial_number === formattedNewSerial) {
        return res.status(400).json({
          success: false,
          message:
            "New serial number is identical to the current serial number",
        });
      }

      // Check if new serial number is already in use in this shop
      const existingProduct = await InvoiceItem.findOne({
        shop_id: user.shopId,
        serial_number: formattedNewSerial,
        _id: { $ne: id },
        deleted_at: null,
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: `Serial number '${formattedNewSerial}' is already in use by another product in your shop`,
        });
      }

      const oldSerial = product.serial_number || "UNKNOWN";
      const replacementDate = new Date();

      // Track replacement details
      product.previous_serial_number = oldSerial;
      product.serial_number = formattedNewSerial;
      product.is_serial_replaced = true;
      product.replacement_date = replacementDate;
      product.replacement_reason = replacement_reason.trim();

      if (!product.replacement_history) {
        product.replacement_history = [];
      }
      product.replacement_history.push({
        previous_serial_number: oldSerial,
        new_serial_number: formattedNewSerial,
        replacement_date: replacementDate,
        replacement_reason: replacement_reason.trim(),
      });

      await product.save();

      res.json({
        success: true,
        message: "Serial number replaced successfully",
        data: { product },
      });
    } catch (error) {
      console.error("Replace serial number error:", error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Serial number already exists in system",
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to replace serial number",
      });
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

  // Autocomplete product names from InvoiceItem history
  async autocomplete(req, res) {
    const { q = "", limit = "10" } = req.query;
    const shopId = req.user.shopId;

    if (!q.trim()) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const lim = Math.min(parseInt(limit, 10) || 10, 20);
    const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    try {
      const fromItems = await InvoiceItem.aggregate([
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
      ]);

      const suggestions = fromItems.map((s) => ({ ...s, source: "history" }));

      return res.json({ success: true, data: { suggestions } });
    } catch (error) {
      console.error("Autocomplete error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Autocomplete failed" });
    }
  }
}
