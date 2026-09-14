import Invoice from "../models/Invoice.js";
import InvoiceCounter from "../models/InvoiceCounter.js";
import { buildInvoiceNumberPreview } from "../../shared/invoiceMath.js";

/**
 * Service for generating sequential and collision-proof invoice numbers per shop.
 */
export class InvoiceSequenceService {
  static async getNextInvoiceSequence(shopId, datePart, session = null) {
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
  }

  /**
   * Robustly generates a guaranteed-unique, sequential invoice number for a shop.
   * Automatically synchronizes with existing database records to prevent any duplicate key errors (E11000).
   */
  static async generateAuthoritativeInvoiceNumber(
    shopId,
    invoiceDate = new Date(),
    session = null,
  ) {
    const dateObj =
      invoiceDate instanceof Date ? invoiceDate : new Date(invoiceDate);
    const { datePart } = buildInvoiceNumberPreview({ date: dateObj });

    // 1. Inspect existing active invoices for this shop + datePart
    const existingInvoices = await Invoice.find({
      shop_id: shopId,
      invoice_number: new RegExp(`^INV-${datePart}-\\d+$`),
      deleted_at: null,
    })
      .select("invoice_number")
      .session(session);

    let maxExistingSeq = 0;
    for (const inv of existingInvoices) {
      if (inv.invoice_number) {
        const match = inv.invoice_number.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxExistingSeq) {
            maxExistingSeq = num;
          }
        }
      }
    }

    // 2. Fast-forward InvoiceCounter if it lags behind existing records
    if (maxExistingSeq > 0) {
      await InvoiceCounter.findOneAndUpdate(
        { shop_id: shopId, date: datePart },
        { $max: { sequence: maxExistingSeq } },
        { upsert: true, new: true, session },
      );
    }

    // 3. Atomically increment and ensure candidate invoice number is unique
    let candidateNumber = "";
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      const sequence = await this.getNextInvoiceSequence(
        shopId,
        datePart,
        session,
      );
      candidateNumber = buildInvoiceNumberPreview({
        date: dateObj,
        sequence,
      }).invoice_number;

      const collision = await Invoice.findOne({
        shop_id: shopId,
        invoice_number: candidateNumber,
        deleted_at: null,
      }).session(session);

      if (!collision) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      const fallbackSeq = Date.now().toString().slice(-4);
      candidateNumber = `INV-${datePart}-${fallbackSeq}`;
    }

    return candidateNumber;
  }
}
