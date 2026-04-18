import { Router } from "express";
import CustomerController from "../controllers/customerController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const customerRouter = Router();
const customerController = new CustomerController();

// Apply authentication to all routes
customerRouter.use(authenticate);

// Create customer
customerRouter.post("/", checkPermission("customers_create"), (req, res) =>
  customerController.createCustomer(req, res),
);

// Get customers list
customerRouter.get("/", checkPermission("customers_view"), (req, res) =>
  customerController.getCustomers(req, res),
);

// Get single customer and their invoices
customerRouter.get("/:id", checkPermission("customers_view"), (req, res) =>
  customerController.getCustomerById(req, res),
);

// Update customer
customerRouter.put("/:id", checkPermission("customers_edit"), (req, res) =>
  customerController.updateCustomer(req, res),
);

// Delete customer (soft delete)
customerRouter.delete(
  "/:id",
  checkPermission("customers_delete"),
  (req, res) => customerController.deleteCustomer(req, res),
);
