import { Router } from "express";
import ProductController from "../controllers/productController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";
import { strictMutationRateLimiter } from "../middleware/rateLimiter.js";

export const productRouter = Router();
const productController = new ProductController();

productRouter.use(authenticate);

productRouter.post("/", strictMutationRateLimiter, checkPermission("products_create"), (req, res) =>
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


productRouter.get("/:id", checkPermission("products_view"), (req, res) =>
  productController.getProductById(req, res),
);
productRouter.put(
  "/:id/replace-serial",
  strictMutationRateLimiter,
  checkPermission("products_edit"),
  (req, res) => productController.replaceSerialNumber(req, res),
);
productRouter.put("/:id", strictMutationRateLimiter, checkPermission("products_edit"), (req, res) =>
  productController.updateProduct(req, res),
);
productRouter.delete("/:id", strictMutationRateLimiter, checkPermission("products_delete"), (req, res) =>
  productController.deleteProduct(req, res),
);
