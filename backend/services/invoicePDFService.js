import { log } from "console";
import { PDFGenerator } from "./pdfGenerator.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InvoicePDFService {
  constructor() {
    this.pdfGenerator = new PDFGenerator();
  }

  // Format currency values
  formatCurrency(amount) {
    // Handle null, undefined, or non-numeric values
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || amount === null || amount === undefined) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(0);
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(numericAmount);
  }

  // Format date
  formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Calculate invoice totals
  calculateTotals(invoiceItems) {
    let subtotal = 0;

    invoiceItems.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const sellingPrice = Number(item.selling_price) || 0;
      subtotal += quantity * sellingPrice;
    });

    const gstRate = 18; // 18% GST
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    return {
      subtotal,
      gstRate,
      gstAmount,
      total,
    };
  }

  // Prepare invoice data for template
  prepareInvoiceData(invoice, customer, invoiceItems, shop) {
    // If invoice is UNPAID or PARTIAL: rely solely on stored invoice fields
    // and do not perform any calculations. Otherwise prefer invoice fields
    // if present, else calculate from items.
    const status = (invoice.payment_status || "").toString().toUpperCase();
    let totals = null;

    if (status === "UNPAID" || status === "PARTIAL") {
      totals = {
        subtotal: Number(invoice.subtotal) || 0,
        gstRate:
          invoice.tax && invoice.subtotal
            ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100
            : null,
        gstAmount: Number(invoice.tax) || 0,
        total: Number(invoice.total_amount) || 0,
      };
    } else if (
      invoice.subtotal !== undefined &&
      invoice.tax !== undefined &&
      invoice.total_amount !== undefined
    ) {
      totals = {
        subtotal: Number(invoice.subtotal) || 0,
        gstRate:
          invoice.tax && invoice.subtotal
            ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100
            : 18,
        gstAmount: Number(invoice.tax) || 0,
        total: Number(invoice.total_amount) || 0,
      };
    } else {
      totals = this.calculateTotals(invoiceItems);
    }

    // Normalize addresses for template
    const normalizeAddress = (addr) => {
      if (!addr) return {};
      if (typeof addr === "string") {
        const parts = addr
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          street: parts[0] || "",
          city: parts[1] || "",
          state: parts[2] || "",
          pincode: parts[3] || "",
        };
      }

      if (typeof addr === "object") {
        const streetParts = [];
        if (addr.line1) streetParts.push(addr.line1);
        if (addr.line2) streetParts.push(addr.line2);
        if (addr.street) streetParts.unshift(addr.street);
        return {
          street: streetParts.join(", ") || addr.street || "",
          city: addr.city || addr.town || "",
          state: addr.state || "",
          pincode: addr.pincode || addr.zip || "",
        };
      }

      return {};
    };

    const customerAddress = normalizeAddress(customer.address || {});
    const shopAddress = normalizeAddress(shop.address || {});

    return {
      // Invoice details
      invoice: {
        number: invoice.invoice_number,
        date: this.formatDate(invoice.invoice_date),
        dueDate: invoice.due_date ? this.formatDate(invoice.due_date) : null,
        payment_status: invoice.payment_status || "UNPAID",
        notes: invoice.notes,
      },

      // Customer details
      customer: {
        name: customer.full_name,
        email:
          customer.email ||
          customer.contact_email ||
          customer.email_address ||
          "",
        mobile:
          customer.whatsapp_number || customer.mobile || customer.phone || "",
        address: customerAddress,
        gstNumber: customer.gst_number,
      },

      // Shop/Company details
      shop: {
        name: shop.shop_name,
        ownerName: shop.owner_name || shop.ownerName || "",
        address: shopAddress,
        mobile:
          shop.phone ||
          shop.mobile ||
          shop.contact ||
          shop.contact_number ||
          "",
        email: shop.email || shop.contact_email || shop.email_address || "",
        gstNumber: shop.gst_number,
        logo_url: shop.logo_url,
      },

      // Invoice items — do not compute amounts when invoice is UNPAID/PARTIAL;
      // show values as present on the item object. If an explicit `amount`
      // is provided on the item, display it; otherwise leave blank to avoid
      // performing backend arithmetic.
      items: invoiceItems.map((item, index) => {
        const quantity = item.quantity !== undefined ? item.quantity : "";
        const unitRaw = item.selling_price ?? item.price ?? null;
        const amountRaw =
          item.amount !== undefined ? Number(item.amount) : null;

        return {
          sno: index + 1,
          productName: item.product_name || "N/A",
          modelNumber: item.model_number || "N/A",
          serialNumber: item.serial_number || "N/A",
          quantity: quantity,
          unitPrice: unitRaw !== null ? this.formatCurrency(unitRaw) : "",
          amount: amountRaw !== null ? this.formatCurrency(amountRaw) : "",
          warrantyPeriod: item.warranty_duration_months
            ? `${item.warranty_duration_months} months`
            : "N/A",
          hasServicePlan: item.service_plan_enabled || false,
        };
      }),

      // Totals (display values taken from invoice when status is UNPAID/PARTIAL)
      totals: {
        subtotal: this.formatCurrency(totals.subtotal),
        gstRate: totals.gstRate,
        gstAmount: this.formatCurrency(totals.gstAmount),
        total: this.formatCurrency(totals.total),
      },

      // Payment info from invoice (show due date when unpaid/partial)
      payment: {
        amount_paid:
          invoice.amount_paid !== undefined
            ? this.formatCurrency(invoice.amount_paid)
            : "",
        amount_due:
          invoice.amount_due !== undefined
            ? this.formatCurrency(invoice.amount_due)
            : "",
        dueDateRaw: invoice.due_date || null,
      },

      // Generated timestamp
      generatedOn: this.formatDate(new Date()),
    };
  }

  // Generate invoice PDF
  async generateInvoicePDF(invoice, customer, invoiceItems, shop) {
    try {
      // Prepare data for template
      const templateData = this.prepareInvoiceData(
        invoice,
        customer,
        invoiceItems,
        shop,
      );
      console.log(
        "Prepared template data for invoice PDF generation",
        templateData,
      );
      // Template path
      const templatePath = path.join(__dirname, "../templates/invoice.ejs");

      // PDF options
      const pdfOptions = {
        format: "A4",
        margin: {
          top: "15mm",
          right: "15mm",
          bottom: "15mm",
          left: "15mm",
        },
      };

      // Generate PDF buffer
      const pdfBuffer = await this.pdfGenerator.createPDFBufferFromTemplate(
        templatePath,
        templateData,
        pdfOptions,
      );

      return {
        success: true,
        filename: `Invoice_${invoice.invoice_number}.pdf`,
        buffer: pdfBuffer,
        contentType: "application/pdf",
      };
    } catch (error) {
      throw new Error(`Invoice PDF generation failed: ${error.message}`);
    }
  }
}
