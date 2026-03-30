import { Router } from "express";
import InvoiceController from "../controllers/invoiceController.js";
import { authenticate, authorize } from "../middleware/auth.js";

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
invoiceRouter.post("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) => {
  return invoiceController.createInvoice(req, res);
});

// Get all invoices with pagination and filters
invoiceRouter.get("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  invoiceController.getInvoices(req, res),
);

// Get single invoice by ID
invoiceRouter.get("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  invoiceController.getInvoiceById(req, res),
);

// Search product by serial number
invoiceRouter.get(
  "/search/serial/:serial_number",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.searchBySerialNumber(req, res),
);

// Get next invoice number
invoiceRouter.get(
  "/next-number",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.getNextInvoiceNumber(req, res),
);

// Check if serial number exists
invoiceRouter.post(
  "/check-serial",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.checkSerialNumber(req, res),
);

// Search customer by WhatsApp number
invoiceRouter.post(
  "/search-customer",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.searchCustomer(req, res),
);

// Update invoice by ID
invoiceRouter.put("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  invoiceController.updateInvoice(req, res),
);

// Delete invoice by ID
invoiceRouter.delete("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
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
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.sendInvoice(req, res),
);

// Send payment reminder via WhatsApp (UNPAID/PARTIAL invoices only)
invoiceRouter.post(
  "/:id/send-payment-reminder",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.sendPaymentReminder(req, res),
);

// Record a payment (full or partial) against an invoice
invoiceRouter.post(
  "/:id/record-payment",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.recordPayment(req, res),
);

// Generate and download invoice PDF
invoiceRouter.get(
  "/:id/pdf",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.generateInvoicePDF(req, res),
);

// Preview invoice PDF in browser
invoiceRouter.get(
  "/:id/preview",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => invoiceController.previewInvoicePDF(req, res),
);
