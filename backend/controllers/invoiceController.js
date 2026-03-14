import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Shop from "../models/Shop.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import { sendWhatsappMessageViaMSG91 } from "../config/msg91.js";
import { InvoicePDFService } from "../services/invoicePDFService.js";
import cloudinaryUpload from "../services/cloudinaryUpload.js";

export default class InvoiceController {
  /**
   * Create a new invoice with customer and product tracking
   */
  async createInvoice(req, res) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const { customer, invoice, invoice_items } = req.body;
      const { user } = req; // From authentication middleware

      // (debug logs removed)

      // Validation
      if (
        !customer ||
        !invoice ||
        !invoice_items ||
        !Array.isArray(invoice_items) ||
        invoice_items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer, invoice details, and at least one invoice item are required",
        });
      }

      // Get user's shop
      const shop = await Shop.findById(user.shopId).session(session);
      if (!shop || shop.deleted_at) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
        });
      }

      // Step 1: Check if customer exists by WhatsApp number, if not create new customer
      let existingCustomer = await Customer.findOne({
        whatsapp_number: customer.whatsapp_number,
        shop_id: user.shopId,
        deleted_at: null,
      }).session(session);

      let customerId;

      if (existingCustomer) {
        // Update existing customer with any new information
        existingCustomer.full_name = customer.full_name;
        existingCustomer.email = customer.email || existingCustomer.email;
        existingCustomer.alternate_phone =
          customer.alternate_phone || existingCustomer.alternate_phone;
        existingCustomer.address = {
          ...existingCustomer.address,
          ...customer.address,
        };
        existingCustomer.gst_number =
          customer.gst_number || existingCustomer.gst_number;
        existingCustomer.customer_type =
          customer.customer_type || existingCustomer.customer_type;
        existingCustomer.notes = customer.notes || existingCustomer.notes;

        await existingCustomer.save({ session });
        customerId = existingCustomer._id;
      } else {
        // Create new customer
        const newCustomer = new Customer({
          full_name: customer.full_name,
          whatsapp_number: customer.whatsapp_number,
          email: customer.email,
          alternate_phone: customer.alternate_phone,
          address: {
            line1: customer.address.line1,
            line2: customer.address.line2,
            city: customer.address.city,
            state: customer.address.state,
            pincode: customer.address.pincode,
          },
          date_of_birth: customer.date_of_birth,
          gst_number: customer.gst_number,
          customer_type: customer.customer_type || "RETAIL",
          preferred_language: customer.preferred_language || "ENGLISH",
          notes: customer.notes,
          shop_id: user.shopId,
        });

        await newCustomer.save({ session });
        customerId = newCustomer._id;
      }

      // Step 2: Validate serial numbers are unique
      for (const item of invoice_items) {
        const existingItem = await InvoiceItem.findOne({
          serial_number: item.serial_number.toUpperCase(),
          shop_id: user.shopId,
          deleted_at: null,
        }).session(session);

        if (existingItem) {
          throw new Error(`Serial number ${item.serial_number} already exists`);
        }
      }

      // Step 3: Generate invoice number if not provided
      let invoiceNumber = invoice.invoice_number;
      if (!invoiceNumber) {
        const currentYear = new Date().getFullYear();
        const invoiceCount = await Invoice.countDocuments({
          shop_id: user.shopId,
          invoice_date: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1),
          },
          deleted_at: null,
        }).session(session);

        invoiceNumber = `INV-${currentYear}-${String(invoiceCount + 1).padStart(4, "0")}`;
      }

      // Step 4: Calculate totals
      // Treat incoming item.selling_price as GST-inclusive amount (matching frontend behavior)
      const inclusiveTotal = invoice_items.reduce(
        (sum, item) =>
          sum + Number(item.selling_price || 0) * Number(item.quantity || 1),
        0,
      );

      const discount = Number(invoice.discount || 0) || 0;
      const taxRate = 0.18; // 18% GST

      // If invoice.tax provided, use it; otherwise compute as percentage of inclusive total
      const tax =
        typeof invoice.tax === "number"
          ? Number(invoice.tax)
          : inclusiveTotal * taxRate;

      // Subtotal is inclusive total minus tax (i.e., amount before GST as per requested behavior)
      const subtotal = inclusiveTotal - tax;

      // Total amount after applying discount should equal inclusiveTotal - discount
      const totalAmount = Math.max(0, inclusiveTotal - discount);

      // Consider any amount_paid submitted
      const amountPaid = Number(invoice.amount_paid || 0) || 0;
      const amountDue = Math.max(0, totalAmount - amountPaid);

      // Step 5: Create invoice
      const newInvoice = new Invoice({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        shop_id: user.shopId,
        invoice_date: invoice.invoice_date || new Date(),
        payment_status: invoice.payment_status || "UNPAID",
        payment_mode: invoice.payment_mode || "CASH",
        subtotal,
        discount,
        tax,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        amount_due: amountDue,
        due_date: invoice.due_date || null,
        created_by: user.userId,
        notes: invoice.notes,
      });

      await newInvoice.save({ session });

      // Step 6: Create invoice items (products)
      const createdInvoiceItems = [];

      for (const item of invoice_items) {
        // Calculate warranty end date
        const warrantyStartDate = new Date(item.warranty_start_date);
        const warrantyEndDate = new Date(warrantyStartDate);
        warrantyEndDate.setMonth(
          warrantyEndDate.getMonth() + item.warranty_duration_months,
        );

        // Pro warranty if provided
        let proWarrantyEndDate = null;
        if (item.pro_warranty_duration_months) {
          proWarrantyEndDate = new Date(warrantyStartDate);
          proWarrantyEndDate.setMonth(
            proWarrantyEndDate.getMonth() + item.pro_warranty_duration_months,
          );
        }

        const invoiceItem = new InvoiceItem({
          invoice_id: newInvoice._id,
          shop_id: user.shopId,
          serial_number: item.serial_number.toUpperCase(),
          product_name: item.product_name,
          product_category: item.product_category,
          company: item.company,
          model_number: item.model_number,
          selling_price: item.selling_price,
          cost_price: item.cost_price,
          quantity: item.quantity || 1,
          warranty_start_date: warrantyStartDate,
          warranty_end_date: warrantyEndDate,
          pro_warranty_end_date: proWarrantyEndDate,
          warranty_type: item.warranty_type || "STANDARD",
          warranty_duration_months: item.warranty_duration_months,
          manufacturing_date: item.manufacturing_date,
          capacity_rating: item.capacity_rating,
          voltage: item.voltage,
          batch_number: item.batch_number,
          purchase_source: item.purchase_source,
          notes: item.notes,
        });

        await invoiceItem.save({ session });
        createdInvoiceItems.push(invoiceItem);

        // Step 7: Create service plan if enabled for this item
        if (item.service_plan_enabled && item.service_plan) {
          const totalServices =
            item.service_plan.total_services &&
            Number(item.service_plan.total_services) > 0
              ? Number(item.service_plan.total_services)
              : 1;

          const serviceStart = item.service_plan.service_start_date
            ? new Date(item.service_plan.service_start_date)
            : new Date();

          const serviceEnd = this.computeServiceEndDate(
            serviceStart,
            item.service_plan.service_interval_type,
            item.service_plan.service_interval_value,
            totalServices,
          );

          const servicePlan = new ServicePlan({
            invoice_item_id: invoiceItem._id,
            shop_id: user.shopId,
            service_interval_type: item.service_plan.service_interval_type,
            service_interval_value: item.service_plan.service_interval_value,
            total_services: totalServices,
            service_start_date: serviceStart,
            service_end_date: serviceEnd,
            service_description: item.service_plan.service_description,
            service_charge: item.service_plan.service_charge || 0,
            is_active: item.service_plan.is_active !== false,
            created_by: user.userId,
          });

          await servicePlan.save({ session });

          // Generate service schedules based on the plan
          await this.generateServiceSchedules(servicePlan, session);
        } else {
          // no service plan for this item
        }
      }

      await session.commitTransaction();

      // Populate customer details for response
      await newInvoice.populate([
        { path: "customer_id", model: "Customer" },
        { path: "created_by", model: "User", select: "name email" },
      ]);

      // Generate and store PDF in Cloudinary after successful invoice creation
      try {
        // Generate PDF
        const pdfService = new InvoicePDFService();
        const pdfResult = await pdfService.generateInvoicePDF(
          newInvoice,
          newInvoice.customer_id,
          createdInvoiceItems,
          shop,
        );

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
          pdfResult.buffer,
          {
            folder: "invoices",
            fileName: `invoice_${newInvoice.invoice_number}_${Date.now()}`,
            tags: [
              "invoice",
              "auto-generated",
              `user_${user.userId}`,
              `invoice_${newInvoice._id}`,
              `shop_${user.shopId}`,
            ],
            overwrite: false,
          },
        );

        // PDF uploaded to Cloudinary

        // Store Cloudinary URL and public ID in the invoice record
        await Invoice.findByIdAndUpdate(newInvoice._id, {
          invoice_pdf: cloudinaryResult.url,
          pdf_public_id: cloudinaryResult.public_id,
        });

        // Add PDF URL to response data
        newInvoice.invoice_pdf = cloudinaryResult.url;
      } catch (pdfError) {
        // PDF auto-generation failed (non-fatal) — record error for response
        console.error("PDF generation/upload error:", pdfError);
        try {
          // attach an error field to the invoice record for debugging (non-fatal)
          await Invoice.findByIdAndUpdate(newInvoice._id, {
            invoice_pdf: null,
            pdf_public_id: null,
            pdf_error: pdfError.message,
          });
        } catch (uErr) {
          console.error("Failed to update invoice with pdf error:", uErr);
        }
        // Also attach to the in-memory object sent in response
        newInvoice.pdf_error = pdfError.message;
      }

      // Send invoice notification via WhatsApp (non-fatal; errors won't block response)
      try {
        const { formatPhoneNumber, isValidWhatsAppNumber } =
          await import("../scheduler/core/utils.js");

        const customerNumber = newInvoice.customer_id?.whatsapp_number;
        const formattedNumber = formatPhoneNumber(customerNumber);

        if (formattedNumber && isValidWhatsAppNumber(formattedNumber)) {
          const vars = {
            1: invoiceNumber,
            2: new Date(newInvoice.invoice_date).toLocaleDateString(),
            3:
              typeof totalAmount === "number"
                ? totalAmount.toFixed(2)
                : String(totalAmount),
            4: newInvoice.due_date
              ? new Date(newInvoice.due_date).toLocaleDateString()
              : "",
            5: shop.shop_name_hi || shop.shop_name_hi,
          };

          // Prepare components with header document if PDF is available
          const msgConfig = {
            templateName: "invoice_created",
            to: formattedNumber,
            components: vars,
            campaignName: "invoice_created",
            hospitalId: shop._id,
            userName: newInvoice.customer_id?.full_name || "",
            messageType: "invoice_created",
          };

          // Add header document separately if PDF is available
          if (newInvoice.invoice_pdf) {
            msgConfig.media = {
              url: newInvoice.invoice_pdf,
              filename: `Invoice_${invoiceNumber}.pdf`,
            };
          }

          // Use MSG91 sender for WhatsApp template messages
          const sendResp = await sendWhatsappMessageViaMSG91(msgConfig);
          // WhatsApp send result available (not logged)
        } else {
          // Skipping WhatsApp send - invalid number
        }
      } catch (waErr) {
        console.error("WhatsApp send error (non-fatal):", waErr);
      }

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: {
          invoice: newInvoice,
          invoice_items: createdInvoiceItems,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          amount_due: amountDue,
          pdf_url: newInvoice.invoice_pdf, // Include PDF URL for immediate access
          pdf_error: newInvoice.pdf_error || null,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Invoice creation error:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create invoice",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Send invoice notification via WhatsApp for an existing invoice
   * POST /invoices/:id/send
   */
  async sendInvoice(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      })
        .populate("customer_id")
        .populate("shop_id");

      if (!invoice) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      // Find shop (ensure exists)
      const shop = await Shop.findById(user.shopId);
      if (!shop || shop.deleted_at) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      const customer = invoice.customer_id;
      const customerNumber = customer?.whatsapp_number;

      // Prepare template variables similar to create flow
      const vars = {
        1: invoice.invoice_number,
        2: new Date(invoice.invoice_date).toLocaleDateString(),
        3:
          typeof invoice.total_amount === "number"
            ? invoice.total_amount.toFixed(2)
            : String(invoice.total_amount),
        4: invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : "",
        5: shop.shop_name_hi || shop.shop_name || "",
      };

      // Prepare message config with header document if PDF is available
      const msgConfig = {
        templateName: "invoice_created",
        to: customerNumber,
        components: vars,
        campaignName: "invoice_created",
        hospitalId: shop._id,
        userName: customer?.full_name || "",
        messageType: "invoice_created",
      };

      // Add header document separately if PDF is available
      if (invoice.invoice_pdf) {
        msgConfig.media = {
          url: invoice.invoice_pdf,
          filename: `Invoice_${invoice.invoice_number}.pdf`,
        };
      }

      // Use MSG91 sender
      console.log("Sending WhatsApp message with config:", msgConfig);
      const sendResp = await sendWhatsappMessageViaMSG91(msgConfig);

      if (!sendResp) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to send WhatsApp message" });
      }

      return res.json({
        success: true,
        message: "Invoice sent via WhatsApp",
        data: sendResp,
      });
    } catch (error) {
      console.error("sendInvoice error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send invoice",
      });
    }
  }

  /**
   * Get all invoices for the shop
   */
  async getInvoices(req, res) {
    try {
      const { user } = req;
      const {
        page = 1,
        limit = 10,
        search,
        search_in,
        status,
        payment_status,
        date_from,
        date_to,
      } = req.query;

      const query = {
        shop_id: user.shopId,
        deleted_at: null,
      };

      // Add filters
      if (payment_status) {
        query.payment_status = payment_status;
      }

      // Add date range filtering
      if (date_from || date_to) {
        query.invoice_date = {};
        if (date_from) {
          query.invoice_date.$gte = new Date(date_from);
        }
        if (date_to) {
          // Add one day to include the end date
          const endDate = new Date(date_to);
          endDate.setDate(endDate.getDate() + 1);
          query.invoice_date.$lt = endDate;
        }
      }

      // Allow filtering by customer_id
      if (req.query.customer_id) {
        query.customer_id = req.query.customer_id;
      }

      const skip = (page - 1) * parseInt(limit);

      // Add search if provided
      if (search) {
        if (search_in === "invoice_number") {
          query.invoice_number = { $regex: search, $options: "i" };
        } else if (search_in === "customer_name") {
          const customers = await Customer.find({
            shop_id: user.shopId,
            deleted_at: null,
            full_name: { $regex: search, $options: "i" },
          }).select("_id");
          const customerIds = customers.map((c) => c._id);
          query.customer_id = { $in: customerIds };
        } else if (search_in === "whatsapp_number") {
          const customers = await Customer.find({
            shop_id: user.shopId,
            deleted_at: null,
            whatsapp_number: { $regex: search, $options: "i" },
          }).select("_id");
          const customerIds = customers.map((c) => c._id);
          query.customer_id = { $in: customerIds };
        } else if (search_in === "product_name") {
          // Search in invoice items for product names
          const invoiceItems = await InvoiceItem.find({
            product_name: { $regex: search, $options: "i" },
          }).select("invoice_id");
          const invoiceIds = invoiceItems.map((item) => item.invoice_id);
          query._id = { $in: invoiceIds };
        } else {
          // Default: search in all fields
          const customers = await Customer.find({
            shop_id: user.shopId,
            deleted_at: null,
            $or: [
              { full_name: { $regex: search, $options: "i" } },
              { whatsapp_number: { $regex: search, $options: "i" } },
            ],
          }).select("_id");

          const customerIds = customers.map((c) => c._id);

          // Also search in product names
          const invoiceItems = await InvoiceItem.find({
            product_name: { $regex: search, $options: "i" },
          }).select("invoice_id");
          const invoiceIds = invoiceItems.map((item) => item.invoice_id);

          query.$or = [
            { customer_id: { $in: customerIds } },
            { invoice_number: { $regex: search, $options: "i" } },
            { _id: { $in: invoiceIds } },
          ];
        }
      }

      const invoicesQuery = Invoice.find(query)
        .populate("customer_id", "full_name whatsapp_number customer_type")
        .populate("created_by", "name email")
        // populate invoice items (virtual) so frontend can show item counts
        .populate({ path: "invoice_items", select: "product_name quantity" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const [invoiceList, totalCount] = await Promise.all([
        invoicesQuery,
        Invoice.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          invoices: invoiceList,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoices",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Get single invoice by ID
   */
  async getInvoiceById(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;

      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      })
        .populate("customer_id")
        .populate("created_by", "name email");

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Get invoice items
      const invoiceItems = await InvoiceItem.find({
        invoice_id: invoice._id,
        deleted_at: null,
      });

      res.json({
        success: true,
        data: {
          invoice,
          invoice_items: invoiceItems,
        },
      });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoice",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Search product by serial number
   */
  async searchBySerialNumber(req, res) {
    try {
      const { user } = req;
      const { serial_number } = req.params;

      const invoiceItem = await InvoiceItem.findOne({
        serial_number: serial_number.toUpperCase(),
        shop_id: user.shopId,
        deleted_at: null,
      }).populate({
        path: "invoice_id",
        populate: {
          path: "customer_id",
          model: "Customer",
        },
      });

      if (!invoiceItem) {
        return res.status(404).json({
          success: false,
          message: "Product not found with this serial number",
        });
      }

      res.json({
        success: true,
        data: invoiceItem,
      });
    } catch (error) {
      console.error("Search serial number error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search product",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Get next invoice number
   */
  async getNextInvoiceNumber(req, res) {
    try {
      const { user } = req;
      const currentYear = new Date().getFullYear();

      const invoiceCount = await Invoice.countDocuments({
        shop_id: user.shopId,
        invoice_date: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1),
        },
        deleted_at: null,
      });

      const nextInvoiceNumber = `INV-${currentYear}-${String(invoiceCount + 1).padStart(4, "0")}`;

      res.json({
        success: true,
        data: {
          invoice_number: nextInvoiceNumber,
          year: currentYear,
          sequence: invoiceCount + 1,
        },
      });
    } catch (error) {
      console.error("Get next invoice number error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get next invoice number",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Check if serial number exists
   */
  async checkSerialNumber(req, res) {
    try {
      const { user } = req;
      const { serial_number } = req.body;

      if (!serial_number) {
        return res.status(400).json({
          success: false,
          message: "Serial number is required",
        });
      }

      const existingItem = await InvoiceItem.findOne({
        serial_number: serial_number.toUpperCase(),
        shop_id: user.shopId,
        deleted_at: null,
      });

      res.json({
        success: true,
        data: {
          exists: !!existingItem,
          serial_number: serial_number.toUpperCase(),
          product: existingItem || null,
        },
      });
    } catch (error) {
      console.error("Check serial number error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check serial number",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Search customer by WhatsApp number
   */
  async searchCustomer(req, res) {
    try {
      const { user } = req;
      const { whatsapp_number } = req.body;

      if (!whatsapp_number) {
        return res.status(400).json({
          success: false,
          message: "WhatsApp number is required",
        });
      }

      const customer = await Customer.findOne({
        whatsapp_number: whatsapp_number,
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
          data: { customer: null },
        });
      }

      res.json({
        success: true,
        message: "Customer found",
        data: { customer },
      });
    } catch (error) {
      console.error("Search customer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search customer",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Update an existing invoice
   */
  async updateInvoice(req, res) {
    const session = await mongoose.startSession();
    let transactionCommitted = false;

    try {
      await session.startTransaction();

      const { id } = req.params;
      const { customer, invoice, invoice_items } = req.body;
      const { user } = req; // From authentication middleware

      // Validation
      if (
        !customer ||
        !invoice ||
        !invoice_items ||
        !Array.isArray(invoice_items) ||
        invoice_items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer, invoice details, and at least one invoice item are required",
        });
      }

      // Check if invoice exists and belongs to user's shop
      const existingInvoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      }).session(session);

      if (!existingInvoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Get user's shop
      const shop = await Shop.findById(user.shopId).session(session);
      if (!shop || shop.deleted_at) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
        });
      }

      // Step 1: Update customer information
      let existingCustomer = await Customer.findOne({
        _id: existingInvoice.customer_id,
        shop_id: user.shopId,
        deleted_at: null,
      }).session(session);

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Update customer details
      existingCustomer.full_name = customer.full_name;
      existingCustomer.whatsapp_number = customer.whatsapp_number;

      // Address may be sent as a string (legacy clients) or an object.
      // Preserve existing address fields where possible.
      if (customer.address) {
        if (typeof customer.address === "string") {
          existingCustomer.address = {
            line1: customer.address,
            line2: existingCustomer.address?.line2 || "",
            city: existingCustomer.address?.city || "",
            state: existingCustomer.address?.state || "",
            pincode: existingCustomer.address?.pincode || "",
          };
        } else if (typeof customer.address === "object") {
          existingCustomer.address = {
            line1:
              customer.address.line1 || existingCustomer.address?.line1 || "",
            line2:
              customer.address.line2 || existingCustomer.address?.line2 || "",
            city: customer.address.city || existingCustomer.address?.city || "",
            state:
              customer.address.state || existingCustomer.address?.state || "",
            pincode:
              customer.address.pincode ||
              existingCustomer.address?.pincode ||
              "",
          };
        }
      }

      existingCustomer.updated_at = new Date();
      await existingCustomer.save({ session });

      // Step 2: Delete existing invoice items
      await InvoiceItem.deleteMany({
        invoice_id: id,
      }).session(session);

      // Step 3: Create new invoice items — create individually so we can
      // compute warranty dates and attach full required fields (matches create flow)
      const createdInvoiceItems = [];

      for (const item of invoice_items) {
        // Compute warranty start/end
        const warrantyStartDate = item.warranty_start_date
          ? new Date(item.warranty_start_date)
          : new Date();
        const warrantyEndDate = new Date(warrantyStartDate);
        if (item.warranty_duration_months) {
          warrantyEndDate.setMonth(
            warrantyEndDate.getMonth() + item.warranty_duration_months,
          );
        }

        // Pro warranty
        let proWarrantyEndDate = null;
        if (item.pro_warranty_duration_months) {
          proWarrantyEndDate = new Date(warrantyStartDate);
          proWarrantyEndDate.setMonth(
            proWarrantyEndDate.getMonth() + item.pro_warranty_duration_months,
          );
        }

        const invoiceItem = new InvoiceItem({
          invoice_id: id,
          shop_id: user.shopId,
          serial_number: item.serial_number
            ? item.serial_number.toUpperCase()
            : undefined,
          product_name: item.product_name || "Unknown Product",
          product_category: item.product_category || "OTHER",
          company: item.company || "UNKNOWN",
          model_number: item.model_number || "N/A",
          selling_price: item.selling_price || parseFloat(item.price) || 0,
          cost_price: item.cost_price,
          quantity: item.quantity || 1,
          warranty_start_date: warrantyStartDate,
          warranty_end_date: warrantyEndDate,
          pro_warranty_end_date: proWarrantyEndDate,
          warranty_type: item.warranty_type || "STANDARD",
          warranty_duration_months: item.warranty_duration_months
            ? item.warranty_duration_months
            : 1,
          manufacturing_date: item.manufacturing_date,
          capacity_rating: item.capacity_rating,
          voltage: item.voltage,
          batch_number: item.batch_number,
          purchase_source: item.purchase_source,
          notes: item.notes,
        });

        await invoiceItem.save({ session });
        createdInvoiceItems.push(invoiceItem);

        // If service plan info present on update, create/replace service plan
        if (item.service_plan_enabled && item.service_plan) {
          const totalServices =
            item.service_plan.total_services &&
            Number(item.service_plan.total_services) > 0
              ? Number(item.service_plan.total_services)
              : 1;

          const serviceStart = item.service_plan.service_start_date
            ? new Date(item.service_plan.service_start_date)
            : new Date();

          const serviceEnd = this.computeServiceEndDate(
            serviceStart,
            item.service_plan.service_interval_type,
            item.service_plan.service_interval_value,
            totalServices,
          );

          const servicePlan = new ServicePlan({
            invoice_item_id: invoiceItem._id,
            shop_id: user.shopId,
            service_interval_type: item.service_plan.service_interval_type,
            service_interval_value: item.service_plan.service_interval_value,
            total_services: totalServices,
            service_start_date: serviceStart,
            service_end_date: serviceEnd,
            service_description: item.service_plan.service_description,
            service_charge: item.service_plan.service_charge || 0,
            is_active: item.service_plan.is_active !== false,
            created_by: user.userId,
          });

          await servicePlan.save({ session });
          // regenerate schedules for updated plan
          await this.generateServiceSchedules(servicePlan, session);
        }
      }

      // Step 4: Update invoice
      const totalAmount = invoice_items.reduce(
        (sum, item) => sum + parseFloat(item.price),
        0,
      );
      const finalAmount = totalAmount - parseFloat(invoice.discount || 0);

      existingInvoice.invoice_number =
        invoice.invoice_number || existingInvoice.invoice_number;
      existingInvoice.invoice_date = new Date(invoice.invoice_date);
      existingInvoice.payment_mode = invoice.payment_mode;
      existingInvoice.payment_status = invoice.payment_status;
      existingInvoice.discount = parseFloat(invoice.discount || 0);
      existingInvoice.total_amount = finalAmount;
      existingInvoice.warranty_months = parseInt(invoice.warranty_months || 0);
      existingInvoice.notes = invoice.notes || "";
      existingInvoice.updated_at = new Date();

      await existingInvoice.save({ session });

      await session.commitTransaction();
      transactionCommitted = true;

      // Return updated invoice with populated data
      const updatedInvoice = await Invoice.findById(id)
        .populate({
          path: "customer_id",
          select: "full_name whatsapp_number address",
        })
        .populate({
          path: "invoice_items",
          select: "product_name serial_number price",
        })
        .populate({
          path: "shop_id",
          select: "shop_name address phone_number",
        });

      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        data: updatedInvoice,
      });
    } catch (error) {
      if (!transactionCommitted) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.error("Failed to abort transaction:", abortErr);
        }
      }
      console.error("Update invoice error:", error);

      if (error.code === 11000) {
        // Handle duplicate key errors
        const duplicateField = Object.keys(error.keyValue)[0];
        return res.status(400).json({
          success: false,
          message: `${duplicateField} already exists`,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete an invoice (soft delete)
   */
  async deleteInvoice(req, res) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const { id } = req.params;
      const { user } = req; // From authentication middleware

      // Check if invoice exists and belongs to user's shop
      const existingInvoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      }).session(session);

      if (!existingInvoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Soft delete the invoice
      existingInvoice.deleted_at = new Date();
      await existingInvoice.save({ session });

      // Soft delete associated invoice items
      await InvoiceItem.updateMany(
        { invoice_id: id },
        { deleted_at: new Date() },
      ).session(session);

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Invoice deleted successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Delete invoice error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Helper method to generate service schedules for a service plan
   */
  async generateServiceSchedules(servicePlan, session = null) {
    try {
      const schedules = [];
      const currentDate = new Date(servicePlan.service_start_date);

      // Use total_services from the service plan, default to 1 if not set
      const totalServices = servicePlan.total_services || 1;

      // generating service schedules

      for (
        let scheduleCount = 0;
        scheduleCount < totalServices;
        scheduleCount++
      ) {
        const scheduledDate = new Date(currentDate);
        const serviceSchedule = new ServiceSchedule({
          service_plan_id: servicePlan._id,
          shop_id: servicePlan.shop_id,
          scheduled_date: scheduledDate,
          service_number: scheduleCount + 1,
          original_date: scheduledDate,
          status: "PENDING",
          service_charge: servicePlan.service_charge,
          service_description: servicePlan.service_description,
          created_by: servicePlan.created_by,
        });

        if (session) {
          await serviceSchedule.save({ session });
        } else {
          await serviceSchedule.save();
        }

        schedules.push(serviceSchedule);

        // Calculate next service date based on interval (except for the last service)
        if (scheduleCount < totalServices - 1) {
          switch (servicePlan.service_interval_type) {
            case "MONTHLY":
              currentDate.setMonth(
                currentDate.getMonth() + servicePlan.service_interval_value,
              );
              break;
            case "QUARTERLY":
              currentDate.setMonth(
                currentDate.getMonth() + 3 * servicePlan.service_interval_value,
              );
              break;
            case "HALF_YEARLY":
              currentDate.setMonth(
                currentDate.getMonth() + 6 * servicePlan.service_interval_value,
              );
              break;
            case "YEARLY":
              currentDate.setFullYear(
                currentDate.getFullYear() + servicePlan.service_interval_value,
              );
              break;
            case "CUSTOM":
              // For custom intervals, default to monthly
              currentDate.setMonth(
                currentDate.getMonth() + servicePlan.service_interval_value,
              );
              break;
            default:
              currentDate.setMonth(
                currentDate.getMonth() + servicePlan.service_interval_value,
              );
          }
        }
      }

      // successfully generated service schedules
      return schedules;
    } catch (error) {
      console.error("Error generating service schedules:", error);
      throw error;
    }
  }

  // Compute service end date based on start date, interval type/value and total services
  computeServiceEndDate(
    serviceStartDate,
    intervalType,
    intervalValue,
    totalServices,
  ) {
    if (!serviceStartDate) return null;
    const start = new Date(serviceStartDate);
    let monthsDelta = 0;

    switch ((intervalType || "MONTHLY").toUpperCase()) {
      case "MONTHLY":
        monthsDelta = intervalValue || 1;
        break;
      case "QUARTERLY":
        monthsDelta = 3 * (intervalValue || 1);
        break;
      case "SEMI_ANNUALLY":
      case "HALF_YEARLY":
        monthsDelta = 6 * (intervalValue || 1);
        break;
      case "ANNUALLY":
      case "YEARLY":
        monthsDelta = 12 * (intervalValue || 1);
        break;
      case "CUSTOM":
        monthsDelta = intervalValue || 1;
        break;
      default:
        monthsDelta = intervalValue || 1;
    }

    const totalMonths = monthsDelta * Math.max((totalServices || 1) - 1, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + totalMonths);
    return end;
  }

  /**
   * Get services for a specific invoice item (product)
   */
  async getInvoiceItemServices(req, res) {
    try {
      const { invoiceId, itemId } = req.params;
      const { user } = req;

      // Validate invoice item exists and belongs to user's shop
      const invoiceItem = await InvoiceItem.findById(itemId).populate({
        path: "invoice_id",
        select: "shop_id invoice_number customer_id",
      });

      if (!invoiceItem || !invoiceItem.invoice_id) {
        return res.status(404).json({
          success: false,
          message: "Invoice item not found",
        });
      }

      if (
        invoiceItem.invoice_id.shop_id.toString() !== user.shopId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get service plan for this item
      const servicePlan = await ServicePlan.findOne({
        invoice_item_id: itemId,
        deleted_at: null,
      });

      if (!servicePlan) {
        return res.json({
          success: true,
          data: {
            hasServicePlan: false,
            product: {
              _id: invoiceItem._id,
              product_name: invoiceItem.product_name,
              serial_number: invoiceItem.serial_number,
              company: invoiceItem.company,
              model_number: invoiceItem.model_number,
            },
          },
        });
      }

      // Get service schedules for this plan
      const schedules = await ServiceSchedule.find({
        service_plan_id: servicePlan._id,
        deleted_at: null,
      }).sort({ scheduled_date: 1 });

      // Transform schedules to frontend format
      const transformedSchedules = schedules.map((schedule) => {
        const now = new Date();
        const scheduledDate = new Date(schedule.scheduled_date);

        // Determine status based on backend status and dates
        let status = "scheduled";
        if (schedule.status === "COMPLETED") {
          status = "completed";
        } else if (schedule.status === "CANCELLED") {
          status = "cancelled";
        } else if (schedule.status === "MISSED" || scheduledDate < now) {
          status = "overdue";
        }

        return {
          _id: schedule._id,
          scheduled_date: schedule.scheduled_date,
          status: status,
          service_number: schedule.service_number,
          original_date: schedule.original_date,
          rescheduled_date: schedule.rescheduled_date,
          reschedule_reason: schedule.reschedule_reason,
          completed_at: schedule.completed_at,
          completed_by: schedule.completed_by,
          cancelled_at: schedule.cancelled_at,
          cancelled_by: schedule.cancelled_by,
          cancellation_reason: schedule.cancellation_reason,
          notes: schedule.notes,
        };
      });

      res.json({
        success: true,
        data: {
          hasServicePlan: true,
          plan: servicePlan,
          schedules: transformedSchedules,
          product: {
            _id: invoiceItem._id,
            product_name: invoiceItem.product_name,
            serial_number: invoiceItem.serial_number,
            company: invoiceItem.company,
            model_number: invoiceItem.model_number,
            warranty_end_date: invoiceItem.warranty_end_date,
          },
        },
      });
    } catch (error) {
      console.error("Get invoice item services error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get services",
      });
    }
  }

  /**
   * Create service plan for an existing invoice item (product)
   */
  async createServiceForProduct(req, res) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const { itemId } = req.params;
      const { user } = req;
      const {
        service_interval_type,
        service_interval_value,
        service_start_date,
        total_services,
        service_description,
        service_charge,
      } = req.body;

      // Validate required fields
      if (
        !service_interval_type ||
        !service_interval_value ||
        !service_start_date
      ) {
        return res.status(400).json({
          success: false,
          message: "Service interval type, value, and start date are required",
        });
      }

      // Validate invoice item exists and belongs to user's shop
      const invoiceItem = await InvoiceItem.findById(itemId)
        .populate("invoice_id")
        .session(session);

      if (!invoiceItem || !invoiceItem.invoice_id) {
        return res.status(404).json({
          success: false,
          message: "Invoice item not found",
        });
      }

      if (
        invoiceItem.invoice_id.shop_id.toString() !== user.shopId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Check if service plan already exists
      const existingPlan = await ServicePlan.findOne({
        invoice_item_id: itemId,
        deleted_at: null,
      }).session(session);

      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: "Service plan already exists for this product",
        });
      }

      // Calculate service end date
      const serviceStart = new Date(service_start_date);
      const totalServicesCount =
        total_services && Number(total_services) > 0
          ? Number(total_services)
          : 1;
      const serviceEnd = this.computeServiceEndDate(
        serviceStart,
        service_interval_type,
        service_interval_value,
        totalServicesCount,
      );

      // Create service plan
      const servicePlan = new ServicePlan({
        invoice_item_id: itemId,
        shop_id: user.shopId,
        service_interval_type,
        service_interval_value,
        total_services: totalServicesCount,
        service_start_date: serviceStart,
        service_end_date: serviceEnd,
        service_description:
          service_description || `Service for ${invoiceItem.product_name}`,
        service_charge: service_charge || 0,
        is_active: true,
        created_by: user.userId,
      });

      await servicePlan.save({ session });

      // Generate service schedules
      await this.generateServiceSchedules(servicePlan, session);

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        data: servicePlan,
        message: "Service plan created successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Create service for product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create service plan",
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate and download invoice PDF
   */
  async generateInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      // Fetch invoice with all related data
      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
      })
        .populate("customer_id")
        .populate("invoice_items");
      // (PDF debug logs removed)

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Check if PDF already exists in Cloudinary
      if (invoice.invoice_pdf) {
        // Fix duplicate folder issue in existing URLs
        let correctedUrl = invoice.invoice_pdf;
        if (correctedUrl.includes("/invoices/invoices/")) {
          correctedUrl = correctedUrl.replace(
            "/invoices/invoices/",
            "/invoices/",
          );

          // Update the database with corrected URL
          try {
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: correctedUrl,
            });
          } catch (updateError) {
            // failed to update corrected URL (non-fatal)
          }
        }

        // Verify if the PDF actually exists in Cloudinary before redirecting
        try {
          const fetch = await import("node-fetch");
          const response = await fetch.default(correctedUrl, {
            method: "HEAD",
          });

          if (response.ok) {
            return res.redirect(correctedUrl);
          } else {
            // Clear the invalid URL from database
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: null,
              pdf_public_id: null,
            }).catch(() => {});
          }
        } catch (verifyError) {
          // Failed to verify - clear invalid URL and regenerate
          await Invoice.findByIdAndUpdate(invoice._id, {
            invoice_pdf: null,
            pdf_public_id: null,
          }).catch(() => {});
        }
      }

      // Fetch shop details
      const shop = await Shop.findById(user.shopId);
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
        });
      }

      // Initialize PDF service and generate PDF
      const pdfService = new InvoicePDFService();
      const pdfResult = await pdfService.generateInvoicePDF(
        invoice,
        invoice.customer_id,
        invoice.invoice_items,
        shop,
      );

      // Upload PDF to Cloudinary for storage
      try {
        // Delete existing PDF if present (for updated invoice data)
        if (invoice.pdf_public_id) {
          try {
            await cloudinaryUpload.deleteFile(invoice.pdf_public_id);
          } catch (deleteError) {
            // Continue even if delete fails (file might not exist)
          }
        }

        const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
          pdfResult.buffer,
          {
            folder: "invoices",
            fileName: `invoice_${invoice.invoice_number}_${Date.now()}`,
            tags: [
              "invoice",
              "generated",
              `user_${user.userId}`,
              `invoice_${invoice._id}`,
            ],
            overwrite: false,
          },
        );

        // Store the Cloudinary URL in the invoice record
        await Invoice.findByIdAndUpdate(invoice._id, {
          invoice_pdf: cloudinaryResult.url,
          pdf_public_id: cloudinaryResult.public_id,
        });
      } catch (cloudinaryError) {
        // Failed to store PDF in Cloudinary (non-fatal)
        // Continue with download even if cloud storage fails
      }

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfResult.filename}"`,
      );
      res.setHeader("Content-Length", pdfResult.buffer.length);

      // Send PDF buffer
      res.send(pdfResult.buffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate invoice PDF",
        error: error.message,
      });
    }
  }

  /**
   * Preview invoice PDF in browser (inline)
   */
  async previewInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      // Fetch invoice with all related data
      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
      })
        .populate("customer_id")
        .populate("invoice_items");

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Check if PDF already exists in Cloudinary
      if (invoice.invoice_pdf) {
        // Fix duplicate folder issue in existing URLs
        let correctedUrl = invoice.invoice_pdf;
        if (correctedUrl.includes("/invoices/invoices/")) {
          correctedUrl = correctedUrl.replace(
            "/invoices/invoices/",
            "/invoices/",
          );

          // Update the database with corrected URL
          try {
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: correctedUrl,
            });
          } catch (updateError) {
            // failed to update corrected URL (non-fatal)
          }
        }

        // Verify if the PDF actually exists in Cloudinary before redirecting
        try {
          const fetch = await import("node-fetch");
          const response = await fetch.default(correctedUrl, {
            method: "HEAD",
          });

          if (response.ok) {
            return res.redirect(correctedUrl);
          } else {
            // Clear the invalid URL from database
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: null,
              pdf_public_id: null,
            }).catch(() => {});
          }
        } catch (verifyError) {
          // Failed to verify - clear invalid URL and regenerate
          await Invoice.findByIdAndUpdate(invoice._id, {
            invoice_pdf: null,
            pdf_public_id: null,
          }).catch(() => {});
        }
      }

      // Fetch shop details
      const shop = await Shop.findById(user.shopId);
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
        });
      }

      // Initialize PDF service and generate PDF
      const pdfService = new InvoicePDFService();
      const pdfResult = await pdfService.generateInvoicePDF(
        invoice,
        invoice.customer_id,
        invoice.invoice_items,
        shop,
      );

      // Upload PDF to Cloudinary for storage (for future use)
      try {
        // Delete existing PDF if present (for updated invoice data)
        if (invoice.pdf_public_id) {
          try {
            await cloudinaryUpload.deleteFile(invoice.pdf_public_id);
          } catch (deleteError) {
            // Continue even if delete fails (file might not exist)
          }
        }

        const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
          pdfResult.buffer,
          {
            folder: "invoices",
            fileName: `invoice_${invoice.invoice_number}_${Date.now()}`,
            tags: [
              "invoice",
              "generated",
              `user_${user.userId}`,
              `invoice_${invoice._id}`,
            ],
            overwrite: false,
          },
        );

        // Store the Cloudinary URL in the invoice record
        await Invoice.findByIdAndUpdate(invoice._id, {
          invoice_pdf: cloudinaryResult.url,
          pdf_public_id: cloudinaryResult.public_id,
        });
      } catch (cloudinaryError) {
        // Failed to store PDF in Cloudinary during preview (non-fatal)
        // Continue with preview even if cloud storage fails
      }

      // Set response headers for PDF preview (inline)
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${pdfResult.filename}"`,
      );
      res.setHeader("Content-Length", pdfResult.buffer.length);

      // Send PDF buffer
      res.send(pdfResult.buffer);
    } catch (error) {
      console.error("PDF preview error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate invoice PDF preview",
        error: error.message,
      });
    }
  }
}
