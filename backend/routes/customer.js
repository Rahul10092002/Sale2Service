import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerLedger,
  recordCustomerPayment,
  updateCustomer,
  deleteCustomer,
  mergeCustomers,
  getAllCustomersLedgerSummary,
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

// Get customer financial ledger
customerRouter.get("/:id/ledger", checkPermission("customers_view"), getCustomerLedger);

// Record bulk customer payment across unpaid invoices (FIFO)
customerRouter.post("/:id/record-payment", checkPermission("customers_edit"), recordCustomerPayment);

// Get single customer and their invoices
customerRouter.get("/:id", checkPermission("customers_view"), getCustomerById);

// Update customer
customerRouter.put("/:id", checkPermission("customers_edit"), updateCustomer);

// Delete customer (soft delete)
customerRouter.delete("/:id", checkPermission("customers_delete"), deleteCustomer);
