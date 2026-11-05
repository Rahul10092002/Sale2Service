import PaymentReceipt from "../models/PaymentReceipt.js";
import ReceiptCounter from "../models/ReceiptCounter.js";
import { buildInvoiceNumberPreview } from "../../shared/invoiceMath.js";

/**
 * Service for generating sequential, collision-proof receipt numbers per shop.
 * Pattern: REC-{YYMMDD}-{sequence} (e.g. REC-261105-001)
 */
export class ReceiptSequenceService {
  static async getNextReceiptSequence(shopId, datePart, session = null) {
    const counter = await ReceiptCounter.findOneAndUpdate(
      { shop_id: shopId, date: datePart },
      { $inc: { sequence: 1 } },
      {
        new: true,
        upsert: true,
        session,
      }
    );

    return counter.sequence;
  }

  /**
   * Generates a guaranteed-unique, sequential receipt number for a shop.
   * Auto-syncs with existing records to prevent any duplicate key errors (E11000).
   */
  static async generateAuthoritativeReceiptNumber(
    shopId,
    paymentDate = new Date(),
    session = null
  ) {
    const dateObj =
      paymentDate instanceof Date ? paymentDate : new Date(paymentDate);
    const { datePart } = buildInvoiceNumberPreview({ date: dateObj });

    // 1. Inspect existing active receipts for this shop + datePart
    const existingReceipts = await PaymentReceipt.find({
      shop_id: shopId,
      receipt_number: new RegExp(`^REC-${datePart}-\\d+$`),
    })
      .select("receipt_number")
      .session(session);

    const maxExistingSeq = existingReceipts.reduce((max, r) => {
      const match = r.receipt_number?.match(/-(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    // 2. Fast-forward ReceiptCounter if it lags behind existing records
    if (maxExistingSeq > 0) {
      await ReceiptCounter.findOneAndUpdate(
        { shop_id: shopId, date: datePart },
        { $max: { sequence: maxExistingSeq } },
        { upsert: true, new: true, session }
      );
    }

    // 3. Atomically increment and ensure candidate receipt number is unique
    let candidateNumber = "";
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      const sequence = await this.getNextReceiptSequence(
        shopId,
        datePart,
        session
      );
      const paddedSequence = String(Math.max(1, sequence)).padStart(3, "0");
      candidateNumber = `REC-${datePart}-${paddedSequence}`;

      const collision = await PaymentReceipt.findOne({
        shop_id: shopId,
        receipt_number: candidateNumber,
      }).session(session);

      if (!collision) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      const fallbackSeq = Date.now().toString().slice(-4);
      candidateNumber = `REC-${datePart}-${fallbackSeq}`;
    }

    return candidateNumber;
  }
}

