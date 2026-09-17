import Shop from "../models/Shop.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import InvoiceItem from "../models/InvoiceItem.js";
import { InvoiceDocumentService } from "./invoiceDocumentService.js";

const invoiceDocumentService = new InvoiceDocumentService();

// In-memory status map per shopId
const jobsMap = new Map();

export class PdfRegenerationService {
  /**
   * Get current background regeneration status for a shop
   */
  getStatus(shopId) {
    const key = String(shopId);
    const job = jobsMap.get(key);
    if (!job) {
      return {
        isRunning: false,
        total: 0,
        processed: 0,
        updated: 0,
        errors: 0,
        startTime: null,
        endTime: null,
        message: "Idle",
        lastError: null,
      };
    }
    return { ...job };
  }

  /**
   * Start batch regeneration in background for a shop
   */
  async startBatchRegeneration(shopId, userId) {
    const key = String(shopId);
    const existingJob = jobsMap.get(key);

    if (existingJob && existingJob.isRunning) {
      const err = new Error("A background PDF regeneration task is already running for your shop.");
      err.statusCode = 409;
      throw err;
    }

    const jobState = {
      isRunning: true,
      total: 0,
      processed: 0,
      updated: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null,
      message: "Initialising background PDF regeneration...",
      lastError: null,
    };

    jobsMap.set(key, jobState);

    // Launch background task asynchronously without awaiting HTTP response
    setImmediate(() => {
      this._executeBatchTask(shopId, userId, jobState).catch((err) => {
        console.error("Batch PDF regeneration task crash:", err);
        jobState.isRunning = false;
        jobState.endTime = new Date();
        jobState.message = "Task terminated unexpectedly";
        jobState.lastError = err.message;
      });
    });

    return jobState;
  }

  /**
   * Internal asynchronous worker task
   */
  async _executeBatchTask(shopId, userId, jobState) {
    try {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        jobState.isRunning = false;
        jobState.message = "Shop not found";
        return;
      }

      const invoices = await Invoice.find({
        shop_id: shopId,
        deleted_at: null,
      }).sort({ createdAt: -1 });

      jobState.total = invoices.length;

      if (invoices.length === 0) {
        jobState.isRunning = false;
        jobState.endTime = new Date();
        jobState.message = "No invoices found for this shop.";
        return;
      }

      jobState.message = `Regenerating ${invoices.length} invoice PDFs in Cloudinary...`;

      const batchSize = 2;
      for (let i = 0; i < invoices.length; i += batchSize) {
        const batch = invoices.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (inv) => {
            try {
              let customer = null;
              if (inv.customer_id) {
                customer = await Customer.findById(inv.customer_id);
              }

              const invoiceItems = await InvoiceItem.find({
                invoice_id: inv._id,
                deleted_at: null,
              });

              await invoiceDocumentService.generateAndStoreInvoicePdf({
                invoice: inv,
                customer: customer || {},
                invoiceItems: invoiceItems || [],
                shop,
                userId,
                tag: "batch_regenerate",
                replaceExisting: true,
              });

              jobState.updated += 1;
            } catch (err) {
              console.error(`Failed to regenerate invoice ${inv.invoice_number}:`, err);
              jobState.errors += 1;
              jobState.lastError = err.message;
            } finally {
              jobState.processed += 1;
            }
          }),
        );

        // Throttle delay to prevent Cloudinary rate limiting
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      jobState.isRunning = false;
      jobState.endTime = new Date();
      jobState.message = `Finished PDF regeneration! Updated ${jobState.updated} invoice PDFs (${jobState.errors} errors).`;
    } catch (err) {
      console.error("Error in PDF regeneration loop:", err);
      jobState.isRunning = false;
      jobState.endTime = new Date();
      jobState.message = "Failed to complete PDF regeneration";
      jobState.lastError = err.message;
    }
  }
}
