import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Multer configuration for file uploads
 * Handles PDF file uploads with validation
 */

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads", "temp");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${extension}`;
    cb(null, filename);
  },
});

// File filter for PDF files only
const fileFilter = (req, file, cb) => {
  // Check file extension
  const allowedExtensions = [".pdf"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check MIME type
  const allowedMimeTypes = ["application/pdf"];
  const fileMimeType = file.mimetype;

  if (
    allowedExtensions.includes(fileExtension) &&
    allowedMimeTypes.includes(fileMimeType)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

// Configure multer with options
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1, // Only one file at a time
  },
});

// For memory storage (buffer upload)
const memoryStorage = multer.memoryStorage();

const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1,
  },
});

/**
 * Error handler for multer
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 10MB.",
          error_code: "FILE_TOO_LARGE",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files. Only one file is allowed.",
          error_code: "TOO_MANY_FILES",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected field name for file upload.",
          error_code: "UNEXPECTED_FIELD",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error.",
          error_code: "UPLOAD_ERROR",
        });
    }
  } else if (error.message === "Only PDF files are allowed!") {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only PDF files are allowed.",
      error_code: "INVALID_FILE_TYPE",
    });
  }

  next(error);
};

export { upload, uploadMemory, handleMulterError };
