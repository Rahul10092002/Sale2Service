import { randomUUID } from "crypto";
import Invoice from "../models/Invoice.js";
import Shop from "../models/Shop.js";
import InvoiceItem from "../models/InvoiceItem.js";
import { InvoiceDocumentService } from "./invoiceDocumentService.js";
import { sendWhatsappMessageViaMSG91 } from "../config/msg91.js";

const invoiceDocumentService = new InvoiceDocumentService();

// Store temporary PDF buffers for local/backend delivery if needed
export const tempPdfRetryStore = new Map();

/**
 * Schedules a delayed retry (1.5 - 2 minutes by default) to generate invoice PDF if missing/failed,
 * and deliver the WhatsApp invoice notification (only if WhatsApp notification is enabled for the invoice).
 */
export function schedulePdfAndWhatsappRetry({
  invoiceId,
  shopId,
  userId,
  delayMs = 90000, // 90 seconds (1.5 minutes)
  attempt = 1,
  sendWhatsapp = null, // explicitly specify if WhatsApp notification is enabled
}) {
  console.log(
    `[Invoice PDF/WhatsApp Retry] Scheduled retry #${attempt} for invoice ${invoiceId} in ${Math.round(
      delayMs / 1000,
    )}s (sendWhatsapp=${sendWhatsapp === null ? "auto" : sendWhatsapp}).`,
  );

  setTimeout(async () => {
    let isWhatsAppEnabled = true;
    try {
      console.log(
        `[Invoice PDF/WhatsApp Retry] Executing retry #${attempt} for invoice ${invoiceId}...`,
      );

      const invoice = await Invoice.findOne({
        _id: invoiceId,
        deleted_at: null,
      }).populate("customer_id");

      if (!invoice) {
        console.log(
          `[Invoice PDF/WhatsApp Retry] Invoice ${invoiceId} not found or deleted. Aborting.`,
        );
        return;
      }

      // Check whether WhatsApp notification is enabled for this invoice
      isWhatsAppEnabled =
        sendWhatsapp !== null
          ? sendWhatsapp !== false && sendWhatsapp !== "false"
          : invoice.send_whatsapp !== false && invoice.send_whatsapp !== "false";

      const isWhatsAppAlreadySent = Boolean(invoice.whatsapp_sent);
      const hasValidPdf = Boolean(invoice.invoice_pdf && !invoice.pdf_error);
      const needsWhatsApp = isWhatsAppEnabled && !isWhatsAppAlreadySent;

      // If PDF already exists and WhatsApp delivery is not needed (either disabled or already completed), abort retry
      if (hasValidPdf && !needsWhatsApp) {
        console.log(
          `[Invoice PDF/WhatsApp Retry] Invoice ${invoice.invoice_number}: PDF already exists and WhatsApp notification is ${
            isWhatsAppAlreadySent ? "already delivered" : "disabled"
          }. Aborting retry.`,
        );
        return;
      }

      const shop = await Shop.findById(shopId || invoice.shop_id);
      if (!shop || shop.deleted_at) {
        console.log(
          `[Invoice PDF/WhatsApp Retry] Shop ${invoice.shop_id} not found. Aborting.`,
        );
        return;
      }

      let pdfUrl = invoice.invoice_pdf;
      let pdfBuffer = null;

      // Step 1: Re-attempt PDF generation if missing or has error
      if (!pdfUrl || invoice.pdf_error) {
        console.log(
          `[Invoice PDF/WhatsApp Retry] Attempting PDF generation for invoice ${invoice.invoice_number}...`,
        );

        const invoiceItems = await InvoiceItem.find({
          invoice_id: invoice._id,
          deleted_at: null,
        });

        try {
          const pdfResult = await invoiceDocumentService.generateAndStoreInvoicePdf({
            invoice,
            customer: invoice.customer_id || {},
            invoiceItems: invoiceItems || [],
            shop,
            userId,
            tag: "retry-auto-generated",
            replaceExisting: true,
          });

          pdfBuffer = pdfResult.buffer;
          pdfUrl = pdfResult.pdf_url || invoice.invoice_pdf;
          console.log(
            `[Invoice PDF/WhatsApp Retry] PDF successfully generated for ${invoice.invoice_number}: ${pdfUrl}`,
          );
        } catch (pdfErr) {
          console.error(
            `[Invoice PDF/WhatsApp Retry] PDF generation failed on attempt #${attempt}:`,
            pdfErr.message,
          );
          await Invoice.findByIdAndUpdate(invoice._id, {
            pdf_error: pdfErr.message,
          }).catch(() => {});
        }
      }

      // If WhatsApp notification is not required (disabled or already sent), finish here
      if (!needsWhatsApp) {
        if (!pdfUrl) {
          console.warn(
            `[Invoice PDF/WhatsApp Retry] PDF generation failed for ${invoice.invoice_number} on attempt #${attempt} (WhatsApp disabled).`,
          );
          if (attempt < 2) {
            schedulePdfAndWhatsappRetry({
              invoiceId,
              shopId,
              userId,
              delayMs: 180000,
              attempt: attempt + 1,
              sendWhatsapp: false,
            });
          }
        } else {
          console.log(
            `[Invoice PDF/WhatsApp Retry] PDF successfully generated for ${invoice.invoice_number}. WhatsApp notification was disabled. Finished retry.`,
          );
        }
        return;
      }

      // Step 2: Format phone number & check WhatsApp readiness
      const { formatPhoneNumber, isValidWhatsAppNumber } = await import(
        "../scheduler/core/utils.js"
      );

      const customerObj = invoice.customer_id || {};
      const customerNumber = customerObj.whatsapp_number;
      const customerName =
        customerObj.full_name ||
        [customerObj.first_name, customerObj.last_name].filter(Boolean).join(" ") ||
        "Customer";
      const formattedNumber = formatPhoneNumber(customerNumber);

      if (!formattedNumber || !isValidWhatsAppNumber(formattedNumber)) {
        console.warn(
          `[Invoice PDF/WhatsApp Retry] Invalid WhatsApp number (${customerNumber}) for invoice ${invoice.invoice_number}.`,
        );
        return;
      }

      // Step 3: Determine media URL
      const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
      const isBackendUrlValid =
        backendUrl.startsWith("http://") || backendUrl.startsWith("https://");

      let mediaUrl = null;
      if (pdfUrl && pdfUrl.startsWith("http")) {
        mediaUrl = pdfUrl;
      } else if (
        pdfBuffer &&
        isBackendUrlValid &&
        !backendUrl.includes("localhost") &&
        !backendUrl.includes("127.0.0.1")
      ) {
        const token = `${invoice._id}_${Date.now()}`;
        tempPdfRetryStore.set(token, {
          buffer: pdfBuffer,
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          expires: Date.now() + 60 * 60 * 1000,
        });
        setTimeout(() => tempPdfRetryStore.delete(token), 60 * 60 * 1000);
        mediaUrl = `${backendUrl}/v1/invoices/public-pdf/${token}`;
      }

      // Step 4: Send WhatsApp Message if PDF media URL is ready
      if (mediaUrl) {
        const vars = {
          1: customerName || "",
          2: shop.shop_name_hi || shop.shop_name || "",
          3: invoice.invoice_number,
          4: new Date(invoice.invoice_date || invoice.createdAt).toLocaleDateString(
            "hi-IN",
          ),
          5:
            typeof invoice.total_amount === "number"
              ? invoice.total_amount.toFixed(2)
              : String(invoice.total_amount),
          6:
            typeof invoice.amount_paid === "number"
              ? invoice.amount_paid.toFixed(2)
              : "0",
          7:
            typeof invoice.amount_due === "number"
              ? invoice.amount_due.toFixed(2)
              : (
                  (invoice.total_amount || 0) - (invoice.amount_paid || 0)
                ).toFixed(2),
          8:
            {
              PAID: "Paid",
              PARTIAL: "Partial",
              UNPAID: "Unpaid",
            }[invoice.payment_status] || "Pending",
          9: shop.contact_number || shop.mobile || shop.phone || "",
        };

        const msgConfig = {
          templateName: "invoice_generated_notification",
          to: formattedNumber,
          components: vars,
          campaignName: "invoice_generated_notification",
          hospitalId: shop._id,
          userName: customerName,
          messageType: "invoice_generated_notification",
          media: {
            url: mediaUrl,
            filename: `Invoice-${invoice.invoice_number}.pdf`,
          },
        };

        await sendWhatsappMessageViaMSG91(msgConfig);

        // Mark invoice as sent
        await Invoice.findByIdAndUpdate(invoice._id, {
          whatsapp_sent: true,
          whatsapp_sent_at: new Date(),
          pdf_error: null,
        }).catch(() => {});

        console.log(
          `[Invoice PDF/WhatsApp Retry] Successfully sent WhatsApp invoice notification for ${invoice.invoice_number}!`,
        );
      } else {
        console.warn(
          `[Invoice PDF/WhatsApp Retry] Media URL still unavailable for ${invoice.invoice_number} on attempt #${attempt}.`,
        );
        if (attempt < 2) {
          schedulePdfAndWhatsappRetry({
            invoiceId,
            shopId,
            userId,
            delayMs: 180000, // 3 minutes for attempt 2
            attempt: attempt + 1,
            sendWhatsapp: true,
          });
        }
      }
    } catch (err) {
      console.error(
        `[Invoice PDF/WhatsApp Retry] Exception on attempt #${attempt} for invoice ${invoiceId}:`,
        err,
      );
      if (attempt < 2) {
        schedulePdfAndWhatsappRetry({
          invoiceId,
          shopId,
          userId,
          delayMs: 180000, // 3 minutes for attempt 2
          attempt: attempt + 1,
          sendWhatsapp: isWhatsAppEnabled,
        });
      }
    }
  }, delayMs);
}

/**
 * Scans DB for any pending invoices in the last 24 hours and retries PDF generation and/or WhatsApp delivery.
 * Differentiates invoices where WhatsApp is disabled (only retries PDF) from invoices where WhatsApp is enabled.
 */
export async function processUnsentPdfInvoices() {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours
    const pendingInvoices = await Invoice.find({
      deleted_at: null,
      createdAt: { $gte: cutoffDate },
      $or: [
        // Case 1: Invoices missing PDF or having generation error (needs PDF generation)
        { invoice_pdf: { $in: [null, ""] } },
        { invoice_pdf: { $exists: false } },
        { pdf_error: { $ne: null } },
        // Case 2: Invoices where WhatsApp notification is enabled but not yet sent
        {
          send_whatsapp: { $ne: false },
          whatsapp_sent: { $ne: true },
        },
      ],
    }).limit(20);

    if (!pendingInvoices || pendingInvoices.length === 0) return;

    console.log(
      `[Invoice PDF/WhatsApp Scanner] Found ${pendingInvoices.length} invoices needing PDF generation or WhatsApp delivery. Processing...`,
    );

    for (const inv of pendingInvoices) {
      const isWhatsAppEnabled = inv.send_whatsapp !== false;
      schedulePdfAndWhatsappRetry({
        invoiceId: inv._id,
        shopId: inv.shop_id,
        userId: inv.created_by,
        delayMs: 5000, // immediate 5s delay
        attempt: 1,
        sendWhatsapp: isWhatsAppEnabled,
      });
    }
  } catch (err) {
    console.error(
      "[Invoice PDF/WhatsApp Scanner] Error processing unsent invoices:",
      err,
    );
  }
}
