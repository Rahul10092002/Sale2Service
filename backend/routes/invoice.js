import { Router } from "express";
import InvoiceController from "../controllers/invoiceController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const invoiceRouter = Router();
const invoiceController = new InvoiceController();

// Public route — serves a temporary PDF for WhatsApp/Meta media delivery.
// Must be registered BEFORE the authenticate middleware below.
invoiceRouter.get("/public-pdf/:token", (req, res) =>
  invoiceController.servePublicPdf(req, res),
);

// Apply authentication to all routes
invoiceRouter.use(authenticate);

// Create new invoice
invoiceRouter.post("/", checkPermission("invoices_create"), (req, res) => {
  return invoiceController.createInvoice(req, res);
});

// Get all invoices with pagination and filters
invoiceRouter.get("/", checkPermission("invoices_view"), (req, res) =>
  invoiceController.getInvoices(req, res),
);

// Get single invoice by ID
invoiceRouter.get("/:id", checkPermission("invoices_view"), (req, res) =>
  invoiceController.getInvoiceById(req, res),
);

// Search product by serial number
invoiceRouter.get(
  "/search/serial/:serial_number",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.searchBySerialNumber(req, res),
);

// Get next invoice number
invoiceRouter.get(
  "/next-number",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.getNextInvoiceNumber(req, res),
);

// Check if serial number exists
invoiceRouter.post(
  "/check-serial",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.checkSerialNumber(req, res),
);

// Search customer by WhatsApp number
invoiceRouter.post(
  "/search-customer",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.searchCustomer(req, res),
);

// Update invoice by ID
invoiceRouter.put("/:id", checkPermission("invoices_edit"), (req, res) =>
  invoiceController.updateInvoice(req, res),
);

// Delete invoice by ID
invoiceRouter.delete("/:id", checkPermission("invoices_delete"), (req, res) =>
  invoiceController.deleteInvoice(req, res),
);

// Get services for a specific invoice item (product)
invoiceRouter.get(
  "/:invoiceId/items/:itemId/services",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.getInvoiceItemServices(req, res),
);

// Create service plan for a specific invoice item
invoiceRouter.post(
  "/items/:itemId/services",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.createServiceForProduct(req, res),
);

// Update service plan charges for a specific invoice item
invoiceRouter.put(
  "/items/:itemId/services/charges",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.updateServicePlanCharges(req, res),
);

// Update full service plan details for a specific invoice item
invoiceRouter.put(
  "/items/:itemId/services",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.updateServicePlan(req, res),
);

// Send invoice by ID (WhatsApp template)
invoiceRouter.post(
  "/:id/send",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.sendInvoice(req, res),
);

// Send payment reminder via WhatsApp (UNPAID/PARTIAL invoices only)
invoiceRouter.post(
  "/:id/send-payment-reminder",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.sendPaymentReminder(req, res),
);

// Record a payment (full or partial) against an invoice
invoiceRouter.post(
  "/:id/record-payment",
  checkPermission("invoices_edit"),
  (req, res) => invoiceController.recordPayment(req, res),
);

// Generate and download invoice PDF
invoiceRouter.get(
  "/:id/pdf",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.generateInvoicePDF(req, res),
);

// Preview invoice PDF in browser
invoiceRouter.get(
  "/:id/preview",
  checkPermission("invoices_view"),
  (req, res) => invoiceController.previewInvoicePDF(req, res),
);
