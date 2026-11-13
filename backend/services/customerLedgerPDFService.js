import path from "path";
import { fileURLToPath } from "url";
import { PDFGenerator } from "./pdfGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomerLedgerPDFService {
  constructor() {
    this.pdfGenerator = new PDFGenerator();
  }

  // Format currency in Indian Rupees format (e.g. ₹1,25,000.00)
  static formatCurrency(amount) {
    const num = Number(amount);
    if (isNaN(num) || num === null || num === undefined) {
      return "₹0.00";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  // Format date to DD-MMM-YYYY
  static formatDate(date) {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  // Format phone number for display (+91 98765 43210) and dialable link
  static formatPhone(rawPhone) {
    if (!rawPhone) return { formatted: "—", calling: "" };
    const digits = String(rawPhone).replace(/\D/g, "");
    const national = digits.length >= 10 ? digits.slice(-10) : digits;
    if (national.length === 10) {
      const formatted = `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
      const calling = `+91${national}`;
      return { formatted, calling };
    }
    return { formatted: rawPhone, calling: rawPhone };
  }

  /**
   * Generates a landscape A4 Outstanding Customers Ledger PDF Buffer
   *
   * @param {Object} params
   * @param {Object} params.shop - Shop record with name, address, contact, logo
   * @param {Array<Object>} params.customers - Customers with pending dues and stats
   * @param {Object} params.summary - Totals and aggregations
   * @returns {Promise<{ buffer: Buffer, filename: string, contentType: string }>}
   */
  async generatePendingCustomersLedgerPDF({ shop, customers = [], summary = {} }) {
    try {
      const templatePath = path.join(__dirname, "../templates/pendingCustomersLedger.ejs");

      const now = new Date();
      const generatedAt = now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Prepare processed customer rows
      const processedCustomers = customers.map((c) => {
        const phoneInfo = CustomerLedgerPDFService.formatPhone(c.whatsapp_number || c.phone);
        const altPhone = c.alternate_phone
          ? CustomerLedgerPDFService.formatPhone(c.alternate_phone).formatted
          : null;

        const totalBilled = Number(c.total_invoiced || 0);
        const totalPaid = Number(c.total_paid || 0);
        const totalDue = Number(c.total_due || 0);

        let addressLine = "";
        let city = "";
        let pincode = "";

        if (c.address) {
          if (typeof c.address === "string") {
            addressLine = c.address;
          } else {
            addressLine = [c.address.line1, c.address.line2].filter(Boolean).join(", ");
            city = c.address.city || "";
            pincode = c.address.pincode || "";
          }
        }

        const lastInvoiceFormatted = c.last_invoice_date
          ? CustomerLedgerPDFService.formatDate(c.last_invoice_date)
          : null;

        return {
          _id: c._id,
          full_name: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed Customer",
          customer_type: c.customer_type || "RETAIL",
          formatted_phone: phoneInfo.formatted,
          calling_phone: phoneInfo.calling,
          alternate_phone: altPhone,
          email: c.email || null,
          gst_number: c.gst_number || null,
          address_line: addressLine,
          city,
          pincode,
          total_invoiced: totalBilled,
          total_paid: totalPaid,
          total_due: totalDue,
          formatted_invoiced: CustomerLedgerPDFService.formatCurrency(totalBilled),
          formatted_paid: CustomerLedgerPDFService.formatCurrency(totalPaid),
          formatted_due: CustomerLedgerPDFService.formatCurrency(totalDue),
          total_invoices: Number(c.total_invoices || 0),
          last_invoice_formatted: lastInvoiceFormatted,
        };
      });

      // Compute aggregated summary
      const totalPendingAmount = summary.totalPendingAmount !== undefined
        ? Number(summary.totalPendingAmount)
        : processedCustomers.reduce((acc, c) => acc + c.total_due, 0);

      const totalBilled = summary.totalBilled !== undefined
        ? Number(summary.totalBilled)
        : processedCustomers.reduce((acc, c) => acc + c.total_invoiced, 0);

      const totalPaid = summary.totalPaid !== undefined
        ? Number(summary.totalPaid)
        : processedCustomers.reduce((acc, c) => acc + c.total_paid, 0);

      const totalCustomersCount = summary.totalCustomers !== undefined
        ? summary.totalCustomers
        : processedCustomers.length;

      const avgDue = totalCustomersCount > 0 ? totalPendingAmount / totalCustomersCount : 0;

      const processedSummary = {
        totalCustomers: totalCustomersCount,
        totalPendingAmount,
        totalBilled,
        totalPaid,
        formattedTotalPending: CustomerLedgerPDFService.formatCurrency(totalPendingAmount),
        formattedTotalBilled: CustomerLedgerPDFService.formatCurrency(totalBilled),
        formattedTotalPaid: CustomerLedgerPDFService.formatCurrency(totalPaid),
        formattedAverageDue: CustomerLedgerPDFService.formatCurrency(avgDue),
      };

      const dateStr = now.toISOString().slice(0, 10);
      const filename = `Pending_Customers_Ledger_${dateStr}.pdf`;

      const processedShop = {
        name: shop?.shop_name || shop?.name || "WarrantyDesk Merchant",
        shop_name: shop?.shop_name || shop?.name || "WarrantyDesk Merchant",
        logo_url: shop?.logo_url || null,
        address: shop?.address || "",
        phone: shop?.phone || shop?.mobile || "",
        email: shop?.email || shop?.contact_email || "",
        gst_number: shop?.gst_number || shop?.gstin || "",
      };

      const templateData = {
        shop: processedShop,
        customers: processedCustomers,
        summary: processedSummary,
        generatedAt,
      };

      const pdfOptions = {
        format: "A4",
        landscape: true,
        printBackground: true,
        waitUntil: "domcontentloaded",
        timeout: 60000,
        margin: {
          top: "8mm",
          right: "10mm",
          bottom: "10mm",
          left: "10mm",
        },
      };

      const pdfBuffer = await this.pdfGenerator.createPDFBufferFromTemplate(
        templatePath,
        templateData,
        pdfOptions
      );

      return {
        success: true,
        filename,
        buffer: pdfBuffer,
        contentType: "application/pdf",
        count: processedCustomers.length,
      };
    } catch (error) {
      console.error("CustomerLedgerPDFService generation error:", error);
      throw new Error(`Failed to generate customer ledger PDF: ${error.message}`);
    }
  }
}

export const customerLedgerPdfService = new CustomerLedgerPDFService();
