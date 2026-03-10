import { Router } from "express";
import CustomerController from "../controllers/customerController.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const customerRouter = Router();
const customerController = new CustomerController();

// Apply authentication to all routes
customerRouter.use(authenticate);

// Create customer
customerRouter.post("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  customerController.createCustomer(req, res),
);

// Get customers list
customerRouter.get("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  customerController.getCustomers(req, res),
);

// Get single customer and their invoices
customerRouter.get("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  customerController.getCustomerById(req, res),
);

// Update customer
customerRouter.put("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  customerController.updateCustomer(req, res),
);

// Delete customer (soft delete)
customerRouter.delete(
  "/:id",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => customerController.deleteCustomer(req, res),
);
