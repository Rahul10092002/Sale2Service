import { randomUUID } from "crypto";
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
import InvoiceCounter from "../models/InvoiceCounter.js";

const getNextInvoiceSequence = async (shopId, datePart, session) => {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { shop_id: shopId, date: datePart },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      session,
    },
  );

  return counter.sequence;
};

// Temporary in-memory store for PDF buffers used during WhatsApp delivery.
// Meta/MSG91 fetches the URL we provide; serving from our own backend avoids
// Cloudinary CDN propagation race (error 131053). Tokens are single-use,
// expire in 5 minutes, and are keyed by a cryptographically random UUID.
const tempPdfStore = new Map();

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
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const datePart = `${year}${month}${day}`; // e.g. "240403"

        const sequence = await getNextInvoiceSequence(
          user.shopId,
          datePart,
          session,
        );

        const paddedSeq = String(sequence).padStart(3, "0");
        invoiceNumber = `INV-${datePart}-${paddedSeq}`;
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
      let amountPaid = Number(invoice.amount_paid || 0) || 0;
      let amountDue = Math.max(0, totalAmount - amountPaid);

      // If client marks invoice as PAID, enforce "paid" semantics:
      // amount_due must be 0 and due_date must be null.
      const incomingPaymentStatus = invoice.payment_status || "UNPAID";
      if (incomingPaymentStatus === "PAID") {
        amountPaid = totalAmount;
        amountDue = 0;
      }

      // Derive payment status from amounts to avoid inconsistent states
      // (e.g. payment_status=PAID but amount_paid=0).
      const derivedPaymentStatus =
        amountDue === 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";
      const dueDateToStore =
        derivedPaymentStatus === "PAID" ? null : invoice.due_date || null;

      // Step 5: Create invoice
      const newInvoice = new Invoice({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        shop_id: user.shopId,
        invoice_date: invoice.invoice_date || new Date(),
        payment_status: derivedPaymentStatus,
        payment_mode: invoice.payment_mode || "CASH",
        subtotal,
        discount,
        tax,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        amount_due: amountDue,
        due_date: dueDateToStore,
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

        const isBattery =
          item.product_category === "BATTERY" &&
          item.battery_type &&
          ["INVERTER_BATTERY", "VEHICLE_BATTERY"].includes(item.battery_type);
        const batteryPayload = isBattery
          ? {
              battery_type: item.battery_type,
              vehicle_name:
                item.battery_type === "VEHICLE_BATTERY"
                  ? (item.vehicle_name || "").trim() || undefined
                  : undefined,
              vehicle_number_plate:
                item.battery_type === "VEHICLE_BATTERY"
                  ? (item.vehicle_number_plate || "").trim().toUpperCase() ||
                    undefined
                  : undefined,
            }
          : {};

        const invoiceItem = new InvoiceItem({
          invoice_id: newInvoice._id,
          shop_id: user.shopId,
          serial_number: item.serial_number.toUpperCase(),
          product_name: item.product_name,
          product_category: item.product_category,
          ...batteryPayload,
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
          // Product image uploaded to Cloudinary before invoice creation
          product_images: item.product_image_url
            ? [item.product_image_url]
            : [],
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
      let pdfBuffer = null; // kept accessible to the WhatsApp IIFE below
      try {
        // Generate PDF
        const pdfService = new InvoicePDFService();
        const pdfResult = await pdfService.generateInvoicePDF(
          newInvoice,
          newInvoice.customer_id,
          createdInvoiceItems,
          shop,
        );
        pdfBuffer = pdfResult.buffer;

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
          pdfResult.buffer,
          {
            folder: "invoices",
            fileName: `invoice_${newInvoice.invoice_number}_${Date.now()}.pdf`,
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

      // Respond immediately — WhatsApp notification is fired asynchronously below
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

      // Send WhatsApp notification asynchronously — fire-and-forget IIFE.
      // We serve the PDF from our own backend (tempPdfStore) rather than
      // passing the Cloudinary URL directly to Meta. This eliminates error 131053
      // caused by CDN propagation delays where Meta's edge hits a node that
      // hasn't yet received the freshly uploaded file.
      (async () => {
        try {
          const { formatPhoneNumber, isValidWhatsAppNumber } =
            await import("../scheduler/core/utils.js");

          const customerNumber = newInvoice.customer_id?.whatsapp_number;
          const customerName = newInvoice.customer_id?.full_name || "";
          const formattedNumber = formatPhoneNumber(customerNumber);
          if (!formattedNumber || !isValidWhatsAppNumber(formattedNumber))
            return;

          // const vars = {
          //   1: invoiceNumber,
          //   2: new Date(newInvoice.invoice_date).toLocaleDateString(),
          //   3:
          //     typeof totalAmount === "number"
          //       ? totalAmount.toFixed(2)
          //       : String(totalAmount),
          //   4: newInvoice.due_date
          //     ? new Date(newInvoice.due_date).toLocaleDateString()
          //     : "",
          //   5: shop.shop_name_hi || shop.shop_name || "",
          // };

         const vars = {
           1: customerName || "",

           2: invoiceNumber,

           3: new Date(newInvoice.invoice_date).toLocaleDateString("hi-IN"),

           4:
             typeof newInvoice.total_amount === "number"
               ? newInvoice.total_amount.toFixed(2)
               : String(newInvoice.total_amount),

           5:
             typeof newInvoice.amount_paid === "number"
               ? newInvoice.amount_paid.toFixed(2)
               : "0",

           6:
             typeof newInvoice.amount_due === "number"
               ? newInvoice.amount_due.toFixed(2)
               : (
                   (newInvoice.total_amount || 0) -
                   (newInvoice.amount_paid || 0)
                 ).toFixed(2),

           7: {
             PAID: "Paid",
             PARTIAL: "Partial",
             UNPAID: "Unpaid",
           }[newInvoice.payment_status] || "Pending",

           8: shop.contact_number || shop.mobile || shop.phone || "",

           9: shop.shop_name_hi || shop.shop_name || "",
         };
          const msgConfig = {
            templateName: "invoice_created",
            to: formattedNumber,
            components: vars,
            campaignName: "invoice_created",
            hospitalId: shop._id,
            userName: newInvoice.customer_id?.full_name || "",
            messageType: "invoice_created",
          };

          if (pdfBuffer) {
            // Serve from our backend so Meta can fetch immediately without CDN delay
            const token = randomUUID();
            tempPdfStore.set(token, {
              buffer: pdfBuffer,
              filename: `Invoice_${invoiceNumber}.pdf`,
              expires: Date.now() + 5 * 60 * 1000,
            });
            setTimeout(() => tempPdfStore.delete(token), 5 * 60 * 1000);
            const backendUrl = (process.env.BACKEND_URL || "").replace(
              /\/$/,
              "",
            );
            msgConfig.media = {
              url: `${backendUrl}/v1/invoices/public-pdf/${token}`,
              filename: `Invoice_${invoiceNumber}.pdf`,
            };
          } else if (newInvoice.invoice_pdf) {
            msgConfig.media = {
              url: newInvoice.invoice_pdf,
              filename: `Invoice_${invoiceNumber}.pdf`,
            };
          }

          await sendWhatsappMessageViaMSG91(msgConfig);
        } catch (waErr) {
          console.error("WhatsApp send error (non-fatal):", waErr);
        }
      })();
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
   * Serve a PDF temporarily stored in memory for WhatsApp delivery.
   * This is a public (unauthenticated) endpoint — the token is a
   * cryptographically random UUID that expires in 10 minutes.
   * Token is NOT single-use so Meta can retry on failure.
   * GET /invoices/public-pdf/:token
   */
  async servePublicPdf(req, res) {
    const { token } = req.params;
    const entry = tempPdfStore.get(token);
    if (!entry || entry.expires < Date.now()) {
      tempPdfStore.delete(token);
      return res
        .status(404)
        .json({ success: false, message: "PDF not found or expired" });
    }
    // Do NOT delete token here — Meta may retry the download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${entry.filename}"`,
    );
    res.setHeader("Content-Length", entry.buffer.length);
    return res.send(entry.buffer);
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

      // Always serve the PDF from our own backend URL so Meta can reliably
      // download it. Cloudinary RAW CDN URLs cause error 131053 because Meta's
      // servers hit geographically distant edge nodes that may not yet have
      // the file, or may be blocked. We proxy the bytes through our server.
      let pdfBuffer = null;

      if (
        invoice.invoice_pdf &&
        !invoice.invoice_pdf.includes("/image/upload/")
      ) {
        // Fetch existing PDF from Cloudinary through our server
        try {
          const { default: nodeFetch } = await import("node-fetch");
          const fetchResp = await nodeFetch(invoice.invoice_pdf, {
            timeout: 10000,
          });
          if (fetchResp.ok) {
            pdfBuffer = Buffer.from(await fetchResp.arrayBuffer());
          }
        } catch (_) {
          // fall through to regenerate below
        }
      }

      if (!pdfBuffer) {
        // Generate fresh PDF (no valid stored URL, or fetch failed)
        try {
          const invoiceItems = await InvoiceItem.find({ invoice_id: id });
          const pdfService = new InvoicePDFService();
          const pdfResult = await pdfService.generateInvoicePDF(
            invoice,
            customer,
            invoiceItems,
            shop,
          );
          pdfBuffer = pdfResult.buffer;
          // Upload and store the fresh PDF for future use
          const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
            pdfBuffer,
            {
              folder: "invoices",
              fileName: `invoice_${invoice.invoice_number}_${Date.now()}.pdf`,
              tags: [
                "invoice",
                "regenerated",
                `invoice_${invoice._id}`,
                `shop_${user.shopId}`,
              ],
              overwrite: false,
            },
          );
          await Invoice.findByIdAndUpdate(id, {
            invoice_pdf: cloudinaryResult.url,
            pdf_public_id: cloudinaryResult.public_id,
          });
        } catch (pdfErr) {
          console.error("PDF generation failed in sendInvoice:", pdfErr);
          return res.status(500).json({
            success: false,
            message: "Cannot send invoice: PDF generation failed",
          });
        }
      }

      // Store buffer in temp map — Meta will fetch from our backend URL
      const token = randomUUID();
      const pdfFilename = `Invoice_${invoice.invoice_number}.pdf`;
      tempPdfStore.set(token, {
        buffer: pdfBuffer,
        filename: pdfFilename,
        expires: Date.now() + 10 * 60 * 1000,
      });
      setTimeout(() => tempPdfStore.delete(token), 10 * 60 * 1000);
      const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
      const pdfUrl = `${backendUrl}/v1/invoices/public-pdf/${token}`;

      const vars = {
        1: customer?.full_name || "",

        2: invoice.invoice_number,

        3: new Date(invoice.invoice_date).toLocaleDateString(),

        4:
          typeof invoice.total_amount === "number"
            ? invoice.total_amount.toFixed(2)
            : String(invoice.total_amount),

        5:
          typeof invoice.paid_amount === "number"
            ? invoice.amount_paid.toFixed(2)
            : "0",

        6:
          typeof invoice.due_amount === "number"
            ? invoice.amount_due.toFixed(2)
            : (
                (invoice.total_amount || 0) - (invoice.paid_amount || 0)
              ).toFixed(2),

        7: {
             PAID: "Paid",
             PARTIAL: "Partial",
             UNPAID: "Unpaid",
           }[invoice.payment_status] || "Pending",

        8: shop.phone || shop.mobile || "",

        9: shop.shop_name_hi || shop.shop_name || "",
      };
      // invoice_created template always requires header_1 document
      const msgConfig = {
        templateName: "invoice_created",
        to: customerNumber,
        components: vars,
        campaignName: "invoice_created",
        hospitalId: shop._id,
        userName: customer?.full_name || "",
        messageType: "invoice_created",
        media: {
          url: pdfUrl,
          filename: `Invoice_${invoice.invoice_number}.pdf`,
        },
      };

      // Use MSG91 sender
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
   * Send payment reminder via WhatsApp for an unpaid/partial invoice
   * POST /invoices/:id/send-payment-reminder
   */
  async sendPaymentReminder(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      })
        .populate("customer_id")
        .populate("invoice_items");

      if (!invoice) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      if (!["UNPAID", "PARTIAL"].includes(invoice.payment_status)) {
        return res.status(400).json({
          success: false,
          message:
            "Payment reminder can only be sent for unpaid or partially paid invoices",
        });
      }

      const shop = await Shop.findById(user.shopId);
      if (!shop || shop.deleted_at) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      const customer = invoice.customer_id;
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: "Customer not found for this invoice",
        });
      }

      const { formatPhoneNumber, isValidWhatsAppNumber, formatDateForMessage } =
        await import("../scheduler/core/utils.js");

      const phoneNumber = formatPhoneNumber(customer.whatsapp_number);
      if (!phoneNumber || !isValidWhatsAppNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Customer does not have a valid WhatsApp number",
        });
      }

      // Template variables matching payment_reminders template (6 params):
      // {{1}}: Pending amount, {{2}}: Invoice number, {{3}}: Due date,
      // {{4}}: Product serial number, {{5}}: Shop contact info, {{6}}: Shop name
      const serialNumber = invoice.invoice_items?.[0]?.serial_number || "N/A";
      const shopContact = formatPhoneNumber(shop?.phone) || "";

      // Determine if invoice is overdue (past due date)
      const isOverdue =
        invoice.due_date && new Date() > new Date(invoice.due_date);
      const templateName = isOverdue ? "payment_missed" : "payment_reminders";

      let vars;
      if (templateName === "payment_missed") {
        // payment_missed template variables:
        // {{1}}: Pending amount, {{2}}: Due date (missed date),
        // {{3}}: Invoice number, {{4}}: Product serial number,
        // {{5}}: Shop contact info, {{6}}: Shop name
        vars = {
          1:
            typeof invoice.amount_due === "number"
              ? invoice.amount_due.toFixed(2)
              : String(invoice.amount_due || "0"),
          2: formatDateForMessage(invoice.due_date),
          3: invoice.invoice_number || "N/A",
          4: serialNumber,
          5: shopContact,
          6: shop.shop_name_hi || shop.shop_name || "",
        };
      } else {
        // payment_reminders template variables:
        // {{1}}: Pending amount, {{2}}: Invoice number, {{3}}: Due date,
        // {{4}}: Product serial number, {{5}}: Shop contact info, {{6}}: Shop name
        vars = {
          1:
            typeof invoice.amount_due === "number"
              ? invoice.amount_due.toFixed(2)
              : String(invoice.amount_due || "0"),
          2: invoice.invoice_number || "N/A",
          3: serialNumber,
          4: formatDateForMessage(invoice.due_date),
          5: shopContact,
          6: shop.shop_name_hi || shop.shop_name || "",
        };
      }

      const buttonSubtype = templateName === "payment_missed" ? "url" : "quick_reply";

      const msgConfig = {
        templateName: templateName,
        to: phoneNumber,
        components: vars,
        buttons: [{ subtype: buttonSubtype, value: shopContact }],
        campaignName: templateName,
        hospitalId: shop._id,
        userName: customer.full_name || "",
        messageType: templateName,
      };

      const sendResp = await sendWhatsappMessageViaMSG91(msgConfig);

      if (!sendResp) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to send payment reminder" });
      }

      return res.json({
        success: true,
        message: "Payment reminder sent via WhatsApp",
        data: sendResp,
      });
    } catch (error) {
      console.error("sendPaymentReminder error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send payment reminder",
      });
    }
  }

  /**
   * Record a payment (full or partial) against an invoice
   * POST /invoices/:id/record-payment
   * Body: { amount, payment_mode }
   */
  async recordPayment(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;
      const { amount, payment_mode } = req.body;

      const paymentAmount = Number(amount);
      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Payment amount must be a positive number",
        });
      }

      const invoice = await Invoice.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (!invoice) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      if (invoice.payment_status === "PAID") {
        return res
          .status(400)
          .json({ success: false, message: "Invoice is already fully paid" });
      }

      const newAmountPaid = Math.min(
        (invoice.amount_paid || 0) + paymentAmount,
        invoice.total_amount,
      );
      const newAmountDue = Math.max(0, invoice.total_amount - newAmountPaid);

      let newStatus;
      if (newAmountDue === 0) {
        newStatus = "PAID";
      } else if (newAmountPaid > 0) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "UNPAID";
      }

      const validPaymentModes = [
        "CASH",
        "UPI",
        "CARD",
        "BANK_TRANSFER",
        "MIXED",
        "CREDIT",
      ];
      const updatedPaymentMode =
        payment_mode && validPaymentModes.includes(payment_mode.toUpperCase())
          ? payment_mode.toUpperCase()
          : invoice.payment_mode;

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        id,
        {
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          payment_status: newStatus,
          payment_mode: updatedPaymentMode,
        },
        { new: true },
      ).populate("customer_id", "full_name whatsapp_number");

      // Send payment_received WhatsApp notification (non-fatal)
      try {
        const shop = await Shop.findById(user.shopId);
        const customer = updatedInvoice.customer_id;
        const {
          formatPhoneNumber,
          isValidWhatsAppNumber,
          formatDateForMessage,
        } = await import("../scheduler/core/utils.js");
        const phoneNumber = formatPhoneNumber(customer?.whatsapp_number);

        if (
          shop &&
          !shop.deleted_at &&
          phoneNumber &&
          isValidWhatsAppNumber(phoneNumber)
        ) {
          // Template payment_received (4 params):
          // {{1}}: Amount paid, {{2}}: Invoice number, {{3}}: Payment date, {{4}}: Shop name
          const vars = {
            1: paymentAmount.toFixed(2),
            2: invoice.invoice_number || "N/A",
            3: formatDateForMessage(new Date()),
            4: shop.shop_name_hi || shop.shop_name || "",
          };

          await sendWhatsappMessageViaMSG91({
            templateName: "payment_received",
            to: phoneNumber,
            components: vars,
            campaignName: "payment_received",
            hospitalId: shop._id,
            userName: customer?.full_name || "",
            messageType: "payment_received",
          });
        }
      } catch (waErr) {
        console.error(
          "payment_received WhatsApp send error (non-fatal):",
          waErr,
        );
      }

      return res.json({
        success: true,
        message:
          newStatus === "PAID"
            ? "Invoice marked as fully paid"
            : `Partial payment of ₹${paymentAmount.toFixed(2)} recorded`,
        data: {
          invoice: updatedInvoice,
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          payment_status: newStatus,
        },
      });
    } catch (error) {
      console.error("recordPayment error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to record payment",
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
        payment_status,
        payment_mode,
        date_from,
        date_to,
        due_date_from,
        due_date_to,
        customer_id,
        min_amount,
        max_amount,
        overdue,
        quick_filter,
      } = req.query;

      const skip = (page - 1) * parseInt(limit);

      // ---------------- BASE MATCH ----------------
      const match = {
        shop_id: new mongoose.Types.ObjectId(user.shopId),
        deleted_at: null,
      };

      if (payment_status) match.payment_status = payment_status;
      if (payment_mode) match.payment_mode = payment_mode;

      if (customer_id) {
        match.customer_id = new mongoose.Types.ObjectId(customer_id);
      }

      // invoice_date filter
      if (date_from || date_to) {
        match.invoice_date = {};
        if (date_from) match.invoice_date.$gte = new Date(date_from);

        if (date_to) {
          const end = new Date(date_to);
          end.setDate(end.getDate() + 1);
          match.invoice_date.$lt = end;
        }
      }

      // due_date filter
      if (due_date_from || due_date_to) {
        match.due_date = {};

        if (due_date_from) {
          match.due_date.$gte = new Date(due_date_from);
        }

        if (due_date_to) {
          const end = new Date(due_date_to);
          end.setDate(end.getDate() + 1);
          match.due_date.$lt = end;
        }
      }

      // amount filter
      if (min_amount || max_amount) {
        match.total_amount = {};
        if (min_amount) match.total_amount.$gte = Number(min_amount);
        if (max_amount) match.total_amount.$lte = Number(max_amount);
      }

      // overdue filter
      if (overdue === "true") {
        match.due_date = { $lt: new Date() };
        match.payment_status = { $ne: "PAID" };
      }

      // quick filter (today)
      if (quick_filter === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        match.invoice_date = { $gte: start, $lte: end };
      }

      // ---------------- PIPELINE ----------------
      const pipeline = [
        { $match: match },

        // CUSTOMER
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer_id",
          },
        },
        { $unwind: { path: "$customer_id", preserveNullAndEmptyArrays: true } },

        // CREATED BY
        {
          $lookup: {
            from: "users",
            localField: "created_by",
            foreignField: "_id",
            as: "created_by",
          },
        },
        { $unwind: { path: "$created_by", preserveNullAndEmptyArrays: true } },

        // ITEMS
        {
          $lookup: {
            from: "invoiceitems",
            localField: "_id",
            foreignField: "invoice_id",
            as: "invoice_items",
          },
        },
      ];

      // ---------------- SEARCH ----------------
      if (search) {
        const regex = new RegExp(search, "i");

        const searchNumber = Number(search);
        const isNumber = !isNaN(searchNumber);

        const searchDate = new Date(search);
        const isValidDate = !isNaN(searchDate.getTime());

        let searchMatch = {};

        if (search_in === "invoice_number") {
          searchMatch = { invoice_number: regex };
        } else if (search_in === "customer_name") {
          searchMatch = { "customer_id.full_name": regex };
        } else if (search_in === "whatsapp_number") {
          searchMatch = { "customer_id.whatsapp_number": regex };
        } else if (search_in === "product_name") {
          searchMatch = { "invoice_items.product_name": regex };
        } else if (search_in === "due_date" && isValidDate) {
          const next = new Date(searchDate);
          next.setDate(next.getDate() + 1);

          searchMatch = {
            due_date: { $gte: searchDate, $lt: next },
          };
        } else if (search_in === "invoice_date" && isValidDate) {
          const next = new Date(searchDate);
          next.setDate(next.getDate() + 1);

          searchMatch = {
            invoice_date: { $gte: searchDate, $lt: next },
          };
        } else if (search_in === "amount" && isNumber) {
          searchMatch = {
            $or: [
              { total_amount: searchNumber },
              { amount_paid: searchNumber },
              { amount_due: searchNumber },
              { subtotal: searchNumber },
            ],
          };
        } else {
          const orConditions = [
            { invoice_number: regex },
            { payment_status: regex },
            { payment_mode: regex },
            { notes: regex },

            { "customer_id.full_name": regex },
            { "customer_id.whatsapp_number": regex },

            { "invoice_items.product_name": regex },
            { "invoice_items.serial_number": regex },
          ];

          if (isNumber) {
            orConditions.push(
              { total_amount: searchNumber },
              { amount_paid: searchNumber },
              { amount_due: searchNumber },
              { subtotal: searchNumber },
            );
          }

          if (isValidDate) {
            const next = new Date(searchDate);
            next.setDate(next.getDate() + 1);

            orConditions.push(
              { invoice_date: { $gte: searchDate, $lt: next } },
              { due_date: { $gte: searchDate, $lt: next } },
            );
          }

          searchMatch = { $or: orConditions };
        }

        if (Object.keys(searchMatch).length > 0) {
          pipeline.push({ $match: searchMatch });
        }
      }

      // ---------------- FACET ----------------
      pipeline.push({
        $facet: {
          invoices: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },

            {
              $project: {
                _id: 1,
                invoice_number: 1,
                shop_id: 1,
                invoice_date: 1,
                payment_status: 1,
                payment_mode: 1,
                subtotal: 1,
                discount: 1,
                tax: 1,
                amount_paid: 1,
                amount_due: 1,
                due_date: 1,
                total_amount: 1,
                extra_documents: 1,
                deleted_at: 1,
                invoice_id: 1,
                createdAt: 1,
                updatedAt: 1,
                invoice_pdf: 1,
                pdf_public_id: 1,
                isActive: 1,

                customer_id: {
                  _id: "$customer_id._id",
                  full_name: "$customer_id.full_name",
                  whatsapp_number: "$customer_id.whatsapp_number",
                  customer_type: "$customer_id.customer_type",
                },

                created_by: {
                  _id: "$created_by._id",
                  name: "$created_by.name",
                  email: "$created_by.email",
                },

                invoice_items: {
                  $map: {
                    input: "$invoice_items",
                    as: "item",
                    in: {
                      _id: "$$item._id",
                      invoice_id: "$$item.invoice_id",
                      product_name: "$$item.product_name",
                      quantity: "$$item.quantity",
                      serial_number: "$$item.serial_number",
                    },
                  },
                },
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      });

      const result = await Invoice.aggregate(pipeline);

      const invoices = result[0].invoices;
      const total = result[0].totalCount[0]?.count || 0;

      res.json({
        success: true,
        data: {
          invoices,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
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

      // Get service plans for each invoice item and transform data
      const itemsWithServicePlans = await Promise.all(
        invoiceItems.map(async (item) => {
          const servicePlan = await ServicePlan.findOne({
            invoice_item_id: item._id,
            deleted_at: null,
          });

          // Transform item to include service plan data as frontend expects
          const itemData = item.toObject();

          if (servicePlan) {
            itemData.service_plan_enabled = servicePlan.is_active;
            itemData.service_plan = {
              service_interval_type: servicePlan.service_interval_type,
              service_interval_value: servicePlan.service_interval_value,
              total_services: servicePlan.total_services,
              service_start_date: servicePlan.service_start_date
                ?.toISOString()
                ?.split("T")[0],
              service_end_date: servicePlan.service_end_date
                ?.toISOString()
                ?.split("T")[0],
              service_description: servicePlan.notes || "",
              service_charge: 0, // Default since not in ServicePlan model
              is_active: servicePlan.is_active,
            };
          } else {
            itemData.service_plan_enabled = false;
            itemData.service_plan = null;
          }

          return itemData;
        }),
      );

      res.json({
        success: true,
        data: {
          invoice,
          invoice_items: itemsWithServicePlans,
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

      // Step 2: Delete existing invoice items and their related service plans
      // First, find all invoice items for this invoice to get their IDs
      const existingItems = await InvoiceItem.find({
        invoice_id: id,
        deleted_at: null,
      }).session(session);

      const existingItemIds = existingItems.map((item) => item._id);

      // Delete existing service plans for these invoice items
      if (existingItemIds.length > 0) {
        await ServicePlan.deleteMany({
          invoice_item_id: { $in: existingItemIds },
        }).session(session);
      }

      // Now delete the invoice items
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

        const isBattery =
          item.product_category === "BATTERY" &&
          item.battery_type &&
          ["INVERTER_BATTERY", "VEHICLE_BATTERY"].includes(item.battery_type);
        const batteryPayload = isBattery
          ? {
              battery_type: item.battery_type,
              vehicle_name:
                item.battery_type === "VEHICLE_BATTERY"
                  ? (item.vehicle_name || "").trim() || undefined
                  : undefined,
              vehicle_number_plate:
                item.battery_type === "VEHICLE_BATTERY"
                  ? (item.vehicle_number_plate || "").trim().toUpperCase() ||
                    undefined
                  : undefined,
            }
          : {};

        const invoiceItem = new InvoiceItem({
          invoice_id: id,
          shop_id: user.shopId,
          serial_number: item.serial_number
            ? item.serial_number.toUpperCase()
            : undefined,
          product_name: item.product_name || "Unknown Product",
          product_category: item.product_category || "OTHER",
          ...batteryPayload,
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
            notes: item.service_plan.service_description || "",
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
   * Update full service plan details for an invoice item.
   * Keeps completed/cancelled schedules; deletes pending ones and regenerates.
   */
  async updateServicePlan(req, res) {
    const session = await mongoose.startSession();
    let transactionStarted = false;

    try {
      await session.startTransaction();
      transactionStarted = true;

      const { itemId } = req.params;
      const { user } = req;
      const {
        service_interval_type,
        service_interval_value,
        total_services,
        service_start_date,
        service_charge,
        service_description,
      } = req.body;

      if (
        !service_interval_type ||
        !service_interval_value ||
        !service_start_date
      ) {
        return res.status(400).json({
          success: false,
          message:
            "service_interval_type, service_interval_value, and service_start_date are required",
        });
      }

      // Validate invoice item belongs to this shop
      const invoiceItem = await InvoiceItem.findById(itemId)
        .populate({ path: "invoice_id", select: "shop_id" })
        .session(session);

      if (!invoiceItem || !invoiceItem.invoice_id) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice item not found" });
      }

      if (
        invoiceItem.invoice_id.shop_id.toString() !== user.shopId.toString()
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      // Find existing service plan
      const existingPlan = await ServicePlan.findOne({
        invoice_item_id: itemId,
        deleted_at: null,
      }).session(session);

      if (!existingPlan) {
        return res.status(404).json({
          success: false,
          message: "Service plan not found for this product",
        });
      }

      const totalServicesCount =
        total_services && Number(total_services) > 0
          ? Number(total_services)
          : 1;

      const serviceStart = new Date(service_start_date);
      const serviceEnd = this.computeServiceEndDate(
        serviceStart,
        service_interval_type,
        Number(service_interval_value),
        totalServicesCount,
      );

      // Update plan fields
      existingPlan.service_interval_type = service_interval_type;
      existingPlan.service_interval_value = Number(service_interval_value);
      existingPlan.total_services = totalServicesCount;
      existingPlan.service_start_date = serviceStart;
      existingPlan.service_end_date = serviceEnd;
      existingPlan.service_charge = parseFloat(service_charge) || 0;
      if (service_description !== undefined) {
        existingPlan.service_description = service_description;
        existingPlan.notes = service_description;
      }
      await existingPlan.save({ session });

      // Count already-completed schedules so we preserve them
      const completedCount = await ServiceSchedule.countDocuments({
        service_plan_id: existingPlan._id,
        status: { $in: ["COMPLETED"] },
        deleted_at: null,
      }).session(session);

      // Delete all non-terminal pending schedules
      await ServiceSchedule.deleteMany({
        service_plan_id: existingPlan._id,
        status: { $in: ["PENDING", "MISSED", "RESCHEDULED"] },
      }).session(session);

      // Regenerate pending schedules for remaining count
      const remainingCount = Math.max(totalServicesCount - completedCount, 0);

      if (remainingCount > 0) {
        const currentDate = new Date(serviceStart);
        for (let i = 0; i < remainingCount; i++) {
          const scheduledDate = new Date(currentDate);
          const serviceSchedule = new ServiceSchedule({
            service_plan_id: existingPlan._id,
            scheduled_date: scheduledDate,
            service_number: completedCount + i + 1,
            original_date: scheduledDate,
            status: "PENDING",
            service_charge: parseFloat(service_charge) || 0,
          });
          await serviceSchedule.save({ session });

          if (i < remainingCount - 1) {
            switch (service_interval_type) {
              case "QUARTERLY":
                currentDate.setMonth(
                  currentDate.getMonth() + 3 * Number(service_interval_value),
                );
                break;
              case "HALF_YEARLY":
                currentDate.setMonth(
                  currentDate.getMonth() + 6 * Number(service_interval_value),
                );
                break;
              case "YEARLY":
                currentDate.setFullYear(
                  currentDate.getFullYear() + Number(service_interval_value),
                );
                break;
              default: // MONTHLY / CUSTOM
                currentDate.setMonth(
                  currentDate.getMonth() + Number(service_interval_value),
                );
            }
          }
        }
      }

      await session.commitTransaction();
      transactionStarted = false;

      return res.status(200).json({
        success: true,
        message: "Service plan updated successfully",
        data: existingPlan,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      console.error("Update service plan error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update service plan",
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
          scheduled_date: scheduledDate,
          service_number: scheduleCount + 1,
          original_date: scheduledDate,
          status: "PENDING",
          service_charge: servicePlan.service_charge || 0,
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
          service_charge: schedule.service_charge,
          amount_collected: schedule.amount_collected,
          payment_status: schedule.payment_status,
          service_visit_id: schedule.service_visit_id,
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
   * Update service plan charges for existing service plans
   */
  async updateServicePlanCharges(req, res) {
    const session = await mongoose.startSession();
    let transactionStarted = false;

    try {
      await session.startTransaction();
      transactionStarted = true;

      const { itemId } = req.params;
      const { user } = req;
      const { service_charge } = req.body;

      // Validate invoice item exists and belongs to user's shop
      const invoiceItem = await InvoiceItem.findById(itemId)
        .populate({
          path: "invoice_id",
          select: "shop_id",
        })
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

      // Find existing service plan
      const existingPlan = await ServicePlan.findOne({
        invoice_item_id: itemId,
        deleted_at: null,
      }).session(session);

      if (!existingPlan) {
        return res.status(404).json({
          success: false,
          message: "Service plan not found for this product",
        });
      }

      // Update service plan charge
      existingPlan.service_charge = parseFloat(service_charge) || 0;
      await existingPlan.save({ session });

      // Update all existing service schedules with new charge
      await ServiceSchedule.updateMany(
        {
          service_plan_id: existingPlan._id,
          deleted_at: null,
        },
        {
          $set: {
            service_charge: parseFloat(service_charge) || 0,
          },
        },
        { session },
      );

      await session.commitTransaction();
      transactionStarted = false;

      res.status(200).json({
        success: true,
        data: existingPlan,
        message: "Service plan charges updated successfully",
      });
    } catch (error) {
      if (transactionStarted) {
        await session.abortTransaction();
      }
      console.error("Update service plan charges error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update service plan charges",
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

        // Verify if the PDF actually exists in Cloudinary and proxy it
        try {
          const fetch = await import("node-fetch");
          const response = await fetch.default(correctedUrl);

          if (response.ok) {
            const pdfBuffer = Buffer.from(await response.arrayBuffer());
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`,
            );
            res.setHeader("Content-Length", pdfBuffer.length);
            return res.send(pdfBuffer);
          } else {
            // Clear the invalid URL from database
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: null,
              pdf_public_id: null,
            }).catch(() => {});
          }
        } catch (verifyError) {
          // Failed to fetch - clear invalid URL and regenerate
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
            fileName: `invoice_${invoice.invoice_number}_${Date.now()}.pdf`,
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
        `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`,
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

        // Verify if the PDF actually exists in Cloudinary and proxy it inline
        try {
          const fetch = await import("node-fetch");
          const response = await fetch.default(correctedUrl);

          if (response.ok) {
            const pdfBuffer = Buffer.from(await response.arrayBuffer());
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="Invoice_${invoice.invoice_number}.pdf"`,
            );
            res.setHeader("Content-Length", pdfBuffer.length);
            return res.send(pdfBuffer);
          } else {
            // Clear the invalid URL from database
            await Invoice.findByIdAndUpdate(invoice._id, {
              invoice_pdf: null,
              pdf_public_id: null,
            }).catch(() => {});
          }
        } catch (verifyError) {
          // Failed to fetch - clear invalid URL and regenerate
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
            fileName: `invoice_${invoice.invoice_number}_${Date.now()}.pdf`,
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
        `inline; filename="Invoice_${invoice.invoice_number}.pdf"`,
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
