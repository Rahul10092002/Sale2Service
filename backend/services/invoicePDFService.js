import { PDFGenerator } from "./pdfGenerator.js";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { mergePdfSettings } from "../constants/pdfSettingsDefaults.js";
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
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Convert number to Indian Currency Words
  amountInWords(num) {
    if (num === null || num === undefined || isNaN(num)) return "";
    const rounded = Math.round(Number(num));
    if (rounded === 0) return "Zero Rupees Only";

    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const inWords = (n) => {
      if (n < 20) return a[n];
      const digit = n % 10;
      return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    };

    let words = "";
    let n = rounded;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    const rem = n % 100;

    if (crore > 0) words += inWords(crore) + " Crore ";
    if (lakh > 0) words += inWords(lakh) + " Lakh ";
    if (thousand > 0) words += inWords(thousand) + " Thousand ";
    if (hundred > 0) words += a[hundred] + " Hundred ";
    if (rem > 0) {
      if (words !== "") words += "and ";
      words += inWords(rem) + " ";
    }

    return words.trim() + " Rupees Only";
  }

  // Calculate invoice totals
  calculateTotals(invoice, invoiceItems, isInterState = false) {
    const totals = calculateInvoiceTotals({
      invoice,
      items: invoiceItems,
    });

    const taxableAmount = Math.max(0, totals.total_amount - totals.tax);
    const gstRate = GST_RATE_PERCENT;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstAmount = totals.tax;
    } else {
      cgstAmount = totals.tax / 2;
      sgstAmount = totals.tax / 2;
    }

    return {
      subtotal: totals.subtotal,
      discount: totals.discount,
      oldItemExchangePrice: totals.old_item_exchange_price,
      taxableAmount,
      isInterState,
      gstRate,
      gstAmount: totals.tax,
      cgstRate: isInterState ? "0%" : `${gstRate / 2}%`,
      sgstRate: isInterState ? "0%" : `${gstRate / 2}%`,
      igstRate: isInterState ? `${gstRate}%` : "0%",
      cgstRateNum: isInterState ? 0 : gstRate / 2,
      sgstRateNum: isInterState ? 0 : gstRate / 2,
      igstRateNum: isInterState ? gstRate : 0,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total: totals.total_amount,
      amountInWords: this.amountInWords(totals.total_amount),
    };
  }

  // Prepare invoice data for template
  async prepareInvoiceData(invoice, customer, invoiceItems, shop) {
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

    // Determine inter-state vs intra-state GST
    const custState = (customerAddress.state || "").trim().toLowerCase();
    const shpState = (shopAddress.state || "").trim().toLowerCase();
    const isInterState = Boolean(custState && shpState && custState !== shpState);

    const totals = this.calculateTotals(invoice, invoiceItems, isInterState);

    const paymentStatus = invoice.payment_status || "UNPAID";
    const isOutstanding = ["UNPAID", "PARTIAL"].includes(paymentStatus);
    const isOverdue =
      Boolean(invoice.due_date) && isOutstanding && new Date(invoice.due_date) < new Date();
    const dueState = isOverdue
      ? "Overdue"
      : isOutstanding
        ? "Payment Due"
        : "Settled";

    const hasCustomerGst = Boolean(customer.gst_number && customer.gst_number.trim());
    const invoiceType = hasCustomerGst ? "B2B (Tax Invoice)" : "B2C (Retail Invoice)";
    const placeOfSupply = customerAddress.state || shopAddress.state || "—";

    const rawProducts = Array.isArray(invoiceItems) ? invoiceItems : [];
    const rawServices = Array.isArray(invoice.services)
      ? invoice.services.map((s) => ({
          ...(s.toObject ? s.toObject() : s),
          item_type: "SERVICE",
        }))
      : [];
    const allItems = [...rawProducts, ...rawServices];
    const pdfSettings = mergePdfSettings(shop.pdf_settings);

    const data = {
      pdf_settings: pdfSettings,
      // Invoice details
      invoice: {
        number: invoice.invoice_number,
        date: this.formatDate(invoice.invoice_date),
        dueDate: invoice.due_date ? this.formatDate(invoice.due_date) : null,
        paymentMode: invoice.payment_mode || "CASH",
        payment_status: paymentStatus,
        dueState,
        isOverdue,
        invoiceType,
        paymentTerms: invoice.due_date ? "Net Due Date" : "Due on Receipt",
        placeOfSupply,
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
        bank_details:
          shop.bank_details && typeof shop.bank_details.toObject === "function"
            ? shop.bank_details.toObject()
            : shop.bank_details || {},
      },
      upiQRCode: null,

      // Invoice items & services — combine product items and invoice.services
      items: allItems.map((item, index) => {
        const itemType = String(item.item_type || "PRODUCT").toUpperCase();
        const isService = itemType === "SERVICE";
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

        const unitTaxable = quantityNum > 0 ? lineTaxable / quantityNum : 0;

        let batteryLine = "";
        if (
          !isService &&
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

        // Warranty formatting
        const warrantyDurationMonths = Number(item.warranty_duration_months) || 0;
        const warrantyType = item.warranty_type || "STANDARD";
        const warrantyStartDate = item.warranty_start_date
          ? this.formatDate(item.warranty_start_date)
          : "";
        const warrantyEndDate = item.warranty_end_date
          ? this.formatDate(item.warranty_end_date)
          : "";
        const proWarrantyEndDate = item.pro_warranty_end_date
          ? this.formatDate(item.pro_warranty_end_date)
          : "";

        let warrantyText = "";
        if (!isService && (warrantyDurationMonths > 0 || warrantyEndDate)) {
          const parts = [];
          if (warrantyDurationMonths > 0) {
            parts.push(`${warrantyDurationMonths} Months Warranty`);
          }
          if (warrantyEndDate) {
            parts.push(`Valid till ${warrantyEndDate}`);
          }
          if (warrantyType && warrantyType !== "STANDARD") {
            parts.push(`(${warrantyType})`);
          }
          warrantyText = parts.join(" · ");
        }

        let proWarrantyText = "";
        if (!isService && proWarrantyEndDate) {
          proWarrantyText = `Pro-Rata Warranty till ${proWarrantyEndDate}`;
        }

        // Service Plan formatting
        let servicePlanSummary = "";
        if (!isService && item.service_plan_enabled && item.service_plan) {
          const sp = item.service_plan;
          const intervalRaw = sp.service_interval_type || "QUARTERLY";
          const intervalFormatted =
            intervalRaw.charAt(0).toUpperCase() + intervalRaw.slice(1).toLowerCase();
          const totalVisits = sp.total_services || 1;
          const startStr = sp.service_start_date
            ? this.formatDate(sp.service_start_date)
            : "";
          const endStr = sp.service_end_date
            ? this.formatDate(sp.service_end_date)
            : "";
          const dateRange =
            startStr && endStr
              ? ` (${startStr} – ${endStr})`
              : startStr
                ? ` (from ${startStr})`
                : "";
          servicePlanSummary = `Service Plan: ${totalVisits} ${intervalFormatted} visit${totalVisits > 1 ? "s" : ""}${dateRange}`;
        }

        const hsnCode =
          item.hsn_code ||
          (item.product_category === "BATTERY"
            ? "8507"
            : item.product_category === "INVERTER"
              ? "8504"
              : item.product_category === "SOLAR_PANEL"
                ? "8541"
                : isService
                  ? "9987"
                  : "—");

        return {
          sno: index + 1,
          itemType,
          isService,
          serviceCategory: item.service_category || "REPAIR",
          productName: item.product_name || "N/A",
          company: item.company || "",
          modelNumber: isService ? "N/A" : item.model_number || "N/A",
          serialNumber: item.serial_number || "N/A",
          hsnCode,
          capacityRating: item.capacity_rating || "",
          voltage: item.voltage || "",
          quantity: quantityNum,
          unitPriceRaw: unitTaxable,
          unitPrice: this.formatCurrency(unitTaxable),
          taxableAmountRaw: lineTaxable,
          taxableAmount: this.formatCurrency(lineTaxable),
          amountRaw: lineTotal,
          amount: this.formatCurrency(lineTotal),
          taxAmountRaw: lineTax,
          taxAmount: this.formatCurrency(lineTax),
          gstRate: item.gst_rate || totals.gstRate || 18,
          warrantyPeriod: warrantyDurationMonths
            ? `${warrantyDurationMonths} months`
            : "N/A",
          warrantyText,
          proWarrantyText,
          hasServicePlan: item.service_plan_enabled || false,
          servicePlanSummary,
          batteryLine,
          notes: item.notes || "",
        };
      }),

      // Totals
      totals: {
        subtotal: this.formatCurrency(totals.subtotal),
        discount: this.formatCurrency(totals.discount),
        discountRaw: totals.discount,
        oldItemExchangePrice: this.formatCurrency(totals.oldItemExchangePrice),
        oldItemExchangePriceRaw: totals.oldItemExchangePrice,
        taxableAmount: this.formatCurrency(totals.taxableAmount),
        taxableAmountRaw: totals.taxableAmount,
        isInterState: totals.isInterState,
        gstRate: totals.gstRate,
        gstAmount: this.formatCurrency(totals.gstAmount),
        cgstAmount: this.formatCurrency(totals.cgstAmount),
        sgstAmount: this.formatCurrency(totals.sgstAmount),
        igstAmount: this.formatCurrency(totals.igstAmount),
        cgstRate: totals.cgstRate,
        sgstRate: totals.sgstRate,
        igstRate: totals.igstRate,
        total: this.formatCurrency(totals.total),
        amountInWords: totals.amountInWords,
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

    // Generate QR Code if UPI ID exists
    const bankDetails =
      shop.bank_details && typeof shop.bank_details.toObject === "function"
        ? shop.bank_details.toObject()
        : (shop.bank_details || {});

    const upiId = (bankDetails?.upi_id || shop.upi_id || "").trim();
    const isUnpaidOrPartial =
      invoice.payment_status === "UNPAID" || invoice.payment_status === "PARTIAL";
    const amountDueNum = Number(invoice.amount_due);
    const grandTotalNum = Number(totals.total);
    const amountToPay = isUnpaidOrPartial
      ? amountDueNum > 0
        ? amountDueNum
        : grandTotalNum
      : grandTotalNum;

    if (upiId) {
      let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shop.shop_name || "Shop")}`;
      if (amountToPay > 0) {
        upiUrl += `&am=${amountToPay}&cu=INR`;
      }
      try {
        data.upiQRCode = await QRCode.toDataURL(upiUrl, {
          width: 140,
          margin: 1,
        });
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

  // Generate a preview PDF using dummy invoice data and custom shop settings
  async generatePreviewPDF(shop) {
    const dummyInvoice = {
      invoice_number: "INV-PREVIEW-2026",
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      payment_mode: "UPI / Online",
      payment_status: "PAID",
      notes:
        "Thank you for shopping with us! Please retain this invoice for warranty registration and service claims.",
    };

    const dummyCustomer = {
      full_name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      whatsapp_number: "+91 98112 34567",
      gst_number: "07BBBPS9081F1ZD",
      address: "Flat 402, Royal Residency, Sector 14, Dwarka, New Delhi - 110078",
    };

    const dummyItems = [
      {
        item_type: "PRODUCT",
        product_name: "Luminous 150Ah Inverter Battery",
        company: "Luminous",
        modelNumber: "ILTT18048",
        serialNumber: "LUM-8849-X92",
        product_category: "BATTERY",
        battery_type: "INVERTER_BATTERY",
        hsn_code: "85072000",
        quantity: 1,
        unit_price: 14500,
        warranty_duration_months: 36,
        warranty_type: "STANDARD",
        warranty_start_date: new Date(),
        warranty_end_date: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
        service_plan_enabled: true,
        service_plan: {
          total_services: 4,
          service_interval_type: "QUARTERLY",
          service_start_date: new Date(),
          service_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        notes: "Heavy-duty tubular battery. Handle upright.",
      },
      {
        item_type: "SERVICE",
        product_name: "Solar & Inverter Wiring & Health Checkup Service",
        service_category: "MAINTENANCE & REPAIR",
        hsn_code: "998714",
        quantity: 1,
        unit_price: 1800,
        warranty_duration_months: 3,
        service_warranty: "90 Days Labor Guarantee",
        notes: "Includes 25-point safety checkup, earthing test & load balancing",
      },
      {
        item_type: "PRODUCT",
        product_name: "Microtek 1000VA Sine Wave Inverter",
        company: "Microtek",
        modelNumber: "SW-1000",
        serialNumber: "MIC-2026-901",
        product_category: "INVERTER",
        hsn_code: "85044090",
        quantity: 1,
        unit_price: 7500,
        warranty_duration_months: 24,
        warranty_type: "STANDARD",
        notes: "Pure sine wave system",
      },
    ];

    return this.generateInvoicePDF(dummyInvoice, dummyCustomer, dummyItems, shop);
  }
}
