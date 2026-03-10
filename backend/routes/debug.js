import express from "express";
import SchedulerService from "../scheduler/index.js";
import Invoice from "../models/Invoice.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Dev-only: trigger scheduler manual run for testing
router.post("/scheduler-run", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const scheduler = new SchedulerService();
    const type = req.body.type || "all"; // Allow testing specific reminder types
    await scheduler.runManualTest(type);
    return res.json({
      success: true,
      message: `Manual scheduler run completed for ${type}`,
    });
  } catch (error) {
    console.error("Manual scheduler run failed:", error);
    return res.status(500).json({
      success: false,
      message: "Manual run failed",
      error: error.message,
    });
  }
});

// Dev-only: get scheduler status
router.get("/scheduler-status", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const scheduler = new SchedulerService();
    const status = scheduler.getStatus();
    return res.json({ success: true, data: status });
  } catch (error) {
    console.error("Get scheduler status failed:", error);
    return res.status(500).json({
      success: false,
      message: "Status check failed",
      error: error.message,
    });
  }
});

// Dev-only: test message sending
router.post("/test-message", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const { phoneNumber, templateName, variables } = req.body;

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "phoneNumber is required" });
    }

    const scheduler = new SchedulerService();
    const result = await scheduler.testMessage(
      phoneNumber,
      templateName,
      variables,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Test message failed:", error);
    return res.status(500).json({
      success: false,
      message: "Test message failed",
      error: error.message,
    });
  }
});

// Dev-only: list invoices for debugging
router.get("/invoices", authenticate, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const { user } = req;
    console.log("🔍 Debug - Listing invoices for user shop:", user.shop);

    const invoices = await Invoice.find({
      shop_id: user.shop,
    }).select("_id invoice_number customer_id invoice_date");

    console.log(`🔍 Debug - Found ${invoices.length} invoices`);

    return res.json({
      success: true,
      data: invoices,
      userShop: user.shop,
      count: invoices.length,
    });
  } catch (error) {
    console.error("List invoices debug failed:", error);
    return res.status(500).json({
      success: false,
      message: "List invoices failed",
      error: error.message,
    });
  }
});

// Dev-only: fix duplicate folder paths in existing PDF URLs
router.post("/fix-pdf-urls", authenticate, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const { user } = req;
    console.log("🔧 Starting PDF URL fix for shop:", user.shopId);

    // Find all invoices with duplicate folder paths
    const invoicesWithDuplicatePaths = await Invoice.find({
      shop_id: user.shopId,
      invoice_pdf: { $regex: "/invoices/invoices/" },
    });

    console.log(
      `📊 Found ${invoicesWithDuplicatePaths.length} invoices with duplicate paths`,
    );

    let fixedCount = 0;
    const results = [];

    for (const invoice of invoicesWithDuplicatePaths) {
      try {
        const originalUrl = invoice.invoice_pdf;
        const correctedUrl = originalUrl.replace(
          "/invoices/invoices/",
          "/invoices/",
        );

        await Invoice.findByIdAndUpdate(invoice._id, {
          invoice_pdf: correctedUrl,
        });

        fixedCount++;
        results.push({
          invoice_id: invoice._id,
          invoice_number: invoice.invoice_number,
          original_url: originalUrl,
          corrected_url: correctedUrl,
          status: "fixed",
        });

        console.log(`✅ Fixed URL for invoice ${invoice.invoice_number}`);
      } catch (fixError) {
        console.error(
          `❌ Failed to fix invoice ${invoice.invoice_number}:`,
          fixError,
        );
        results.push({
          invoice_id: invoice._id,
          invoice_number: invoice.invoice_number,
          status: "failed",
          error: fixError.message,
        });
      }
    }

    return res.json({
      success: true,
      message: `Fixed ${fixedCount} out of ${invoicesWithDuplicatePaths.length} PDF URLs`,
      data: {
        total_found: invoicesWithDuplicatePaths.length,
        fixed_count: fixedCount,
        details: results,
      },
    });
  } catch (error) {
    console.error("Fix PDF URLs failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fix PDF URLs",
      error: error.message,
    });
  }
});

// Dev-only: test PDF data preparation
router.get("/test-pdf-data/:invoiceId", authenticate, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Not allowed in production" });
  }

  try {
    const { user } = req;
    const { invoiceId } = req.params;

    console.log("🧪 Testing PDF data for invoice:", invoiceId);

    // Fetch invoice with all related data
    const invoice = await Invoice.findOne({
      _id: invoiceId,
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

    // Fetch shop details
    const shop = await Shop.findById(user.shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // Test PDF service data preparation
    const { InvoicePDFService } =
      await import("../services/invoicePDFService.js");
    const pdfService = new InvoicePDFService();

    const templateData = pdfService.prepareInvoiceData(
      invoice,
      invoice.customer_id,
      invoice.invoice_items,
      shop,
    );

    return res.json({
      success: true,
      message: "PDF data preparation test completed",
      data: {
        raw_invoice: {
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total_amount: invoice.total_amount,
          payment_status: invoice.payment_status,
        },
        raw_customer: {
          full_name: invoice.customer_id?.full_name,
          whatsapp_number: invoice.customer_id?.whatsapp_number,
          email: invoice.customer_id?.email,
        },
        raw_items: invoice.invoice_items?.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          selling_price: item.selling_price,
          model_number: item.model_number,
          serial_number: item.serial_number,
        })),
        prepared_template_data: templateData,
      },
    });
  } catch (error) {
    console.error("Test PDF data failed:", error);
    return res.status(500).json({
      success: false,
      message: "PDF data test failed",
      error: error.message,
    });
  }
});

export default router;
