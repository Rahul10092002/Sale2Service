import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

export const customerRouter = Router();

// Apply authentication to all routes
customerRouter.use(authenticate);

// Create customer
customerRouter.post("/", checkPermission("customers_create"), createCustomer);

// Get customers list
customerRouter.get("/", checkPermission("customers_view"), getCustomers);

// Get single customer and their invoices
customerRouter.get("/:id", checkPermission("customers_view"), getCustomerById);

// Update customer
customerRouter.put("/:id", checkPermission("customers_edit"), updateCustomer);

// Delete customer (soft delete)
customerRouter.delete("/:id", checkPermission("customers_delete"), deleteCustomer);
