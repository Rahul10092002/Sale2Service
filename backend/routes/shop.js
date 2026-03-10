import { Router } from "express";
import multer from "multer";
import ShopController from "../controllers/shopController.js";
import { authenticate, authorize } from "../middleware/auth.js";

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

// Get shop profile (All authenticated users)
shopRouter.get("/profile", (req, res) => shopController.getProfile(req, res));

// Update shop profile (Only OWNER)
shopRouter.put("/profile", authorize("OWNER"), (req, res) =>
  shopController.updateProfile(req, res),
);

// Upload shop logo (Only OWNER)
shopRouter.post(
  "/upload-logo",
  authorize("OWNER"),
  upload.single("logo"),
  (req, res) => shopController.uploadLogo(req, res),
);

// Delete shop logo (Only OWNER)
shopRouter.delete("/delete-logo", authorize("OWNER"), (req, res) =>
  shopController.deleteLogo(req, res),
);
