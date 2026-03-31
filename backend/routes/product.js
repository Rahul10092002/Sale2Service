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
// Must be registered BEFORE /:id so Express doesn't treat "barcode-lookup" as an id
productRouter.get(
  "/barcode-lookup",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => productController.lookupBarcode(req, res),
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
