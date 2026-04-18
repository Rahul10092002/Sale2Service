import { Router } from "express";
import multer from "multer";
import ShopController from "../controllers/shopController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const shopRouter = Router();
const shopController = new ShopController();

// Configure multer for logo upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
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
shopRouter.get("/profile", checkPermission("settings_view"), (req, res) => shopController.getProfile(req, res));

// Update shop profile
shopRouter.put("/profile", checkPermission("settings_edit"), (req, res) =>
  shopController.updateProfile(req, res),
);

// Upload shop logo
shopRouter.post(
  "/upload-logo",
  checkPermission("settings_edit"),
  upload.single("logo"),
  (req, res) => shopController.uploadLogo(req, res),
);

// Delete shop logo
shopRouter.delete("/delete-logo", checkPermission("settings_edit"), (req, res) =>
  shopController.deleteLogo(req, res),
);
