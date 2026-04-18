import { Router } from "express";
import ProductController from "../controllers/productController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const productRouter = Router();
const productController = new ProductController();

productRouter.use(authenticate);

productRouter.post("/", checkPermission("products_create"), (req, res) =>
  productController.createProduct(req, res),
);
productRouter.get("/", checkPermission("products_view"), (req, res) =>
  productController.getProducts(req, res),
);
productRouter.get(
  "/autocomplete",
  checkPermission("products_view"),
  (req, res) => productController.autocomplete(req, res),
);
productRouter.post(
  "/master-save",
  checkPermission("inventory_create"),
  (req, res) => productController.saveMaster(req, res),
);
// Inventory (ProductMaster) Routes
productRouter.get(
  "/inventory",
  checkPermission("inventory_view"),
  (req, res) => productController.getMasterProducts(req, res),
);
productRouter.put(
  "/inventory/:id",
  checkPermission("inventory_edit"),
  (req, res) => productController.updateMasterProduct(req, res),
);
productRouter.delete(
  "/inventory/:id",
  checkPermission("inventory_delete"),
  (req, res) => productController.deleteMasterProduct(req, res),
);

productRouter.get("/:id", checkPermission("products_view"), (req, res) =>
  productController.getProductById(req, res),
);
productRouter.put("/:id", checkPermission("products_edit"), (req, res) =>
  productController.updateProduct(req, res),
);
productRouter.delete("/:id", checkPermission("products_delete"), (req, res) =>
  productController.deleteProduct(req, res),
);
