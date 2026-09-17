import { Router } from "express";
import multer from "multer";
import {
  getProfile,
  updateProfile,
  uploadLogo,
  deleteLogo,
  regenerateInvoicesPdf,
  getPdfRegenerationStatus,
  previewPdfSettings,
} from "../controllers/shopController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

export const shopRouter = Router();

// Configure multer for logo upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// All routes require authentication
shopRouter.use(authenticate);

// Get shop profile
shopRouter.get("/profile", checkPermission("settings_view"), getProfile);

// Update shop profile
shopRouter.put("/profile", checkPermission("settings_edit"), updateProfile);

// Upload shop logo
shopRouter.post(
  "/upload-logo",
  checkPermission("settings_edit"),
  upload.single("logo"),
  uploadLogo,
);

// Delete shop logo
shopRouter.delete("/delete-logo", checkPermission("settings_edit"), deleteLogo);

// Regenerate invoice PDFs in background
shopRouter.post(
  "/regenerate-invoices-pdf",
  checkPermission("settings_edit"),
  regenerateInvoicesPdf,
);

// Get background regeneration status
shopRouter.get(
  "/regenerate-invoices-pdf/status",
  checkPermission("settings_view"),
  getPdfRegenerationStatus,
);

// Preview PDF settings with dummy invoice data (opens in new tab)
shopRouter.post(
  "/preview-pdf",
  checkPermission("settings_view"),
  previewPdfSettings,
);
