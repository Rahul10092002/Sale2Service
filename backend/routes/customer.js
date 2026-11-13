import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerLedger,
  recordCustomerPayment,
  getCustomerPayments,
  reversePaymentReceipt,
  updateCustomer,
  deleteCustomer,
  mergeCustomers,
  getAllCustomersLedgerSummary,
  exportPendingCustomersLedgerPdf,
  sendCustomerPaymentReminder,
} from "../controllers/customerController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

export const customerRouter = Router();

// Apply authentication to all routes
customerRouter.use(authenticate);

// Create customer
customerRouter.post("/", checkPermission("customers_create"), createCustomer);

// Merge duplicate customers
customerRouter.post("/merge", checkPermission("customers_edit"), mergeCustomers);

// Get customers list
customerRouter.get("/", checkPermission("customers_view"), getCustomers);

// Get overall customer ledger summary
customerRouter.get("/ledger-summary", checkPermission("customers_view"), getAllCustomersLedgerSummary);

// Export pending customers ledger as PDF (for calling debtors & printing)
customerRouter.get("/export-pending-ledger-pdf", checkPermission("customers_view"), exportPendingCustomersLedgerPdf);

// Get customer financial ledger
customerRouter.get("/:id/ledger", checkPermission("customers_view"), getCustomerLedger);

// Record customer payment (FIFO, Manual, or Advance deposit)
customerRouter.post("/:id/record-payment", checkPermission("customers_edit"), recordCustomerPayment);
customerRouter.post("/:id/payments", checkPermission("customers_edit"), recordCustomerPayment);

// Send consolidated WhatsApp payment reminder
customerRouter.post("/:id/send-payment-reminder", checkPermission("customers_edit"), sendCustomerPaymentReminder);

// Get all payment receipts for a customer
customerRouter.get("/:id/payments", checkPermission("customers_view"), getCustomerPayments);

// Reverse a payment receipt
customerRouter.post("/payments/:receiptId/reverse", checkPermission("customers_edit"), reversePaymentReceipt);

// Get single customer and their invoices
customerRouter.get("/:id", checkPermission("customers_view"), getCustomerById);

// Update customer
customerRouter.put("/:id", checkPermission("customers_edit"), updateCustomer);

// Delete customer (soft delete)
customerRouter.delete("/:id", checkPermission("customers_delete"), deleteCustomer);
