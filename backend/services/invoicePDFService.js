import { PDFGenerator } from "./pdfGenerator.js";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import {
  GST_RATE_PERCENT,
  GST_RATE_DECIMAL,
  calculateInvoiceTotals,
  getInvoiceItemAmount,
  getInvoiceItemUnitPrice,
} from "../../shared/invoiceMath.js";

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
  calculateTotals(invoice, invoiceItems) {
    const totals = calculateInvoiceTotals({
      invoice,
      items: invoiceItems,
    });

    return {
      subtotal: totals.subtotal,
      discount: totals.discount,
      gstRate: GST_RATE_PERCENT,
      gstAmount: totals.tax,
      total: totals.total_amount,
    };
  }

  // Prepare invoice data for template
  async prepareInvoiceData(invoice, customer, invoiceItems, shop) {
    const totals = this.calculateTotals(invoice, invoiceItems);

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
    const paymentStatus = invoice.payment_status || "UNPAID";
    const isOutstanding = ["UNPAID", "PARTIAL"].includes(paymentStatus);
    const isOverdue =
      Boolean(invoice.due_date) && isOutstanding && new Date(invoice.due_date) < new Date();
    const dueState = isOverdue
      ? "Overdue"
      : isOutstanding
        ? "Payment Due"
        : "Settled";

    const data = {
      // Invoice details
      invoice: {
        number: invoice.invoice_number,
        date: this.formatDate(invoice.invoice_date),
        dueDate: invoice.due_date ? this.formatDate(invoice.due_date) : null,
        paymentMode: invoice.payment_mode || "CASH",
        payment_status: paymentStatus,
        dueState,
        isOverdue,
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
        bank_details: shop.bank_details || {},
      },
      upiQRCode: null,

      // Invoice items — do not compute amounts when invoice is UNPAID/PARTIAL;
      // show values as present on the item object. If an explicit `amount`
      // is provided on the item, display it; otherwise leave blank to avoid
      // performing backend arithmetic.
      items: invoiceItems.map((item, index) => {
        const quantityNum = item.quantity !== undefined ? Number(item.quantity) : 1;
        const unitRaw = getInvoiceItemUnitPrice(item);
        const lineOriginal = unitRaw * quantityNum;

        const isTaxInclusive = invoice.is_tax_inclusive !== false;
        const taxRate = GST_RATE_DECIMAL;
        
        let lineTaxable = 0;
        let lineTax = 0;
        let lineTotal = 0;

        if (isTaxInclusive) {
          lineTotal = lineOriginal;
          lineTaxable = lineOriginal / (1 + taxRate);
          lineTax = lineOriginal - lineTaxable;
        } else {
          lineTaxable = lineOriginal;
          lineTax = lineOriginal * taxRate;
          lineTotal = lineOriginal + lineTax;
        }

        const unitTaxable = lineTaxable / quantityNum;

        let batteryLine = "";
        if (
          item.product_category === "BATTERY" &&
          item.battery_type &&
          ["INVERTER_BATTERY", "VEHICLE_BATTERY"].includes(item.battery_type)
        ) {
          const typeLabel =
            item.battery_type === "INVERTER_BATTERY"
              ? "Inverter battery"
              : "Vehicle battery";
          if (item.battery_type === "VEHICLE_BATTERY") {
            const vehicleBits = [
              item.vehicle_name?.trim(),
              item.vehicle_number_plate?.trim(),
            ].filter(Boolean);
            batteryLine = vehicleBits.length
              ? `${typeLabel}: ${vehicleBits.join(" · ")}`
              : typeLabel;
          } else {
            batteryLine = typeLabel;
          }
        }

        return {
          sno: index + 1,
          productName: item.product_name || "N/A",
          modelNumber: item.model_number || "N/A",
          serialNumber: item.serial_number || "N/A",
          quantity: quantityNum,
          unitPrice: this.formatCurrency(unitTaxable),
          amount: this.formatCurrency(lineTotal),
          taxAmount: this.formatCurrency(lineTax),
          warrantyPeriod: item.warranty_duration_months
            ? `${item.warranty_duration_months} months`
            : "N/A",
          hasServicePlan: item.service_plan_enabled || false,
          batteryLine,
        };
      }),

      // Totals (display values taken from invoice when status is UNPAID/PARTIAL)
      totals: {
        subtotal: this.formatCurrency(totals.subtotal),
        discount: this.formatCurrency(totals.discount),
        discountRaw: totals.discount,
        gstRate: totals.gstRate,
        gstAmount: this.formatCurrency(totals.gstAmount),
        total: this.formatCurrency(totals.total),
      },

      // Payment info from invoice (show due date when unpaid/partial)
      payment: {
        amountPaidRaw: Number(invoice.amount_paid) || 0,
        amount_paid:
          invoice.amount_paid !== undefined
            ? this.formatCurrency(invoice.amount_paid)
            : "",
        amountDueRaw: Number(invoice.amount_due) || 0,
        amount_due:
          invoice.amount_due !== undefined
            ? this.formatCurrency(invoice.amount_due)
            : "",
        dueDateRaw: invoice.due_date || null,
      },

      // Generated timestamp
      generatedOn: this.formatDate(new Date()),
    };

    // Generate QR Code if UPI ID and amount exists
    const upiId = shop.bank_details?.upi_id;
    const rawTotal = totals.total; // totals.total is numeric from calculateTotals

    if (upiId && rawTotal > 0) {
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shop.shop_name)}&am=${rawTotal}&cu=INR`;
      try {
        data.upiQRCode = await QRCode.toDataURL(upiUrl);
      } catch (err) {
        console.error("Failed to generate UPI QR Code:", err);
      }
    }

    return data;
  }

  // Generate invoice PDF
  async generateInvoicePDF(invoice, customer, invoiceItems, shop) {
    try {
      // Prepare data for template
      const templateData = await this.prepareInvoiceData(
        invoice,
        customer,
        invoiceItems,
        shop,
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
