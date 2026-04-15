import Invoice from "../models/Invoice.js";
import cloudinaryUpload from "./cloudinaryUpload.js";
import { InvoicePDFService } from "./invoicePDFService.js";

export class InvoiceDocumentService {
  constructor() {
    this.pdfService = new InvoicePDFService();
  }

  async generateAndStoreInvoicePdf({
    invoice,
    customer,
    invoiceItems,
    shop,
    userId,
    tag = "generated",
    replaceExisting = true,
  }) {
    const pdfResult = await this.pdfService.generateInvoicePDF(
      invoice,
      customer,
      invoiceItems,
      shop,
    );

    let uploadError = null;

    try {
      if (replaceExisting && invoice.pdf_public_id) {
        try {
          await cloudinaryUpload.deleteFile(invoice.pdf_public_id);
        } catch (_) {
          // Continue even when the previous asset is already missing.
        }
      }

      const cloudinaryResult = await cloudinaryUpload.uploadPDFFromBuffer(
        pdfResult.buffer,
        {
          folder: "invoices",
          fileName: `invoice_${invoice.invoice_number}_${Date.now()}.pdf`,
          tags: [
            "invoice",
            tag,
            `invoice_${invoice._id}`,
            ...(userId ? [`user_${userId}`] : []),
            ...(invoice.shop_id ? [`shop_${invoice.shop_id}`] : []),
          ],
          overwrite: false,
        },
      );

      await Invoice.findByIdAndUpdate(invoice._id, {
        invoice_pdf: cloudinaryResult.url,
        pdf_public_id: cloudinaryResult.public_id,
        pdf_error: null,
      }).catch(() => {});

      invoice.invoice_pdf = cloudinaryResult.url;
      invoice.pdf_public_id = cloudinaryResult.public_id;
      invoice.pdf_error = null;
    } catch (error) {
      uploadError = error;
    }

    return {
      buffer: pdfResult.buffer,
      filename: pdfResult.filename,
      contentType: pdfResult.contentType,
      pdf_url: invoice.invoice_pdf || null,
      uploadError,
    };
  }

  normalizeInvoicePdfUrl(url) {
    if (!url) {
      return null;
    }

    if (url.includes("/invoices/invoices/")) {
      return url.replace("/invoices/invoices/", "/invoices/");
    }

    return url;
  }

  async fetchStoredInvoicePdf(invoice) {
    if (!invoice?.invoice_pdf) {
      return null;
    }

    const correctedUrl = this.normalizeInvoicePdfUrl(invoice.invoice_pdf);

    if (correctedUrl !== invoice.invoice_pdf) {
      await Invoice.findByIdAndUpdate(invoice._id, {
        invoice_pdf: correctedUrl,
      }).catch(() => {});
      invoice.invoice_pdf = correctedUrl;
    }

    try {
      const response = await fetch(correctedUrl);
      if (!response.ok) {
        throw new Error(`Stored PDF fetch failed with status ${response.status}`);
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      return {
        buffer: pdfBuffer,
        filename: `Invoice_${invoice.invoice_number}.pdf`,
        pdf_url: correctedUrl,
      };
    } catch (_) {
      await Invoice.findByIdAndUpdate(invoice._id, {
        invoice_pdf: null,
        pdf_public_id: null,
      }).catch(() => {});
      invoice.invoice_pdf = null;
      invoice.pdf_public_id = null;
      return null;
    }
  }

  async getOrCreateInvoicePdf({
    invoice,
    customer,
    invoiceItems,
    shop,
    userId,
    tag = "generated",
  }) {
    const storedPdf = await this.fetchStoredInvoicePdf(invoice);
    if (storedPdf) {
      return storedPdf;
    }

    return this.generateAndStoreInvoicePdf({
      invoice,
      customer,
      invoiceItems,
      shop,
      userId,
      tag,
    });
  }
}
