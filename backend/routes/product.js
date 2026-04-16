import { Router } from "express";
import ProductController from "../controllers/productController.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const productRouter = Router();
const productController = new ProductController();

productRouter.use(authenticate);

productRouter.post("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  productController.createProduct(req, res),
);
productRouter.get("/", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  productController.getProducts(req, res),
);
productRouter.get(
  "/autocomplete",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.autocomplete(req, res),
);
productRouter.post(
  "/master-save",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.saveMaster(req, res),
);
// Inventory (ProductMaster) Routes
productRouter.get(
  "/inventory",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.getMasterProducts(req, res),
);
productRouter.put(
  "/inventory/:id",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.updateMasterProduct(req, res),
);
productRouter.delete(
  "/inventory/:id",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.deleteMasterProduct(req, res),
);

productRouter.get("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  productController.getProductById(req, res),
);
productRouter.put("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  productController.updateProduct(req, res),
);
productRouter.delete("/:id", authorize("OWNER", "ADMIN", "STAFF"), (req, res) =>
  productController.deleteProduct(req, res),
);
