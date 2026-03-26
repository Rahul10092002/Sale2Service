import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  upload,
  uploadMemory,
  uploadImageMemory,
  handleMulterError,
} from "../middleware/upload.js";
import fileUploadController from "../controllers/fileUploadController.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Upload PDF invoice file to Cloudinary (disk storage)
 * POST /upload-invoice
 */
router.post(
  "/upload-invoice",
  authorize("OWNER", "ADMIN", "STAFF"),
  upload.single("invoice"), // 'invoice' is the field name
  handleMulterError,
  fileUploadController.uploadInvoice,
);

/**
 * Upload PDF invoice file from memory buffer
 * POST /upload-invoice-buffer
 */
router.post(
  "/upload-invoice-buffer",
  authorize("OWNER", "ADMIN", "STAFF"),
  uploadMemory.single("invoice"),
  handleMulterError,
  fileUploadController.uploadInvoiceFromBuffer,
);

/**
 * Delete PDF invoice file from Cloudinary
 * DELETE /delete-invoice/:publicId
 */
router.delete(
  "/delete-invoice/:publicId",
  authorize("OWNER", "ADMIN"),
  fileUploadController.deleteInvoice,
);

/**
 * Generate secure download URL for PDF
 * GET /secure-url/:publicId
 */
router.get(
  "/secure-url/:publicId",
  authorize("OWNER", "ADMIN", "STAFF"),
  fileUploadController.generateSecureUrl,
);

/**
 * Upload product image to Cloudinary
 * POST /product-image
 */
router.post(
  "/product-image",
  authorize("OWNER", "ADMIN", "STAFF"),
  uploadImageMemory.single("product_image"),
  handleMulterError,
  fileUploadController.uploadProductImage,
);

export default router;
