import cloudinaryUpload from "../services/cloudinaryUpload.js";
import path from "path";

/**
 * File Upload Controller
 * Handles PDF file uploads to Cloudinary
 */
class FileUploadController {
  /**
   * Upload PDF file to Cloudinary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadInvoice(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          error_code: "NO_FILE",
        });
      }

      const { user } = req;
      const file = req.file;

      console.log(`📂 Processing file upload: ${file.originalname}`);

      // Extract file info
      const fileName = path.parse(file.originalname).name;
      const timestamp = Date.now();
      const uniqueFileName = `${fileName}_${timestamp}`;

      // Upload to Cloudinary
      const uploadResult = await cloudinaryUpload.uploadPDF(file.path, {
        folder: "invoices",
        fileName: uniqueFileName,
        tags: ["invoice", "pdf", `user_${user.userId}`],
        overwrite: false,
      });

      // Clean up temporary file
      await cloudinaryUpload.cleanupTempFile(file.path);

      // Return success response
      return res.status(200).json({
        success: true,
        message: "PDF uploaded successfully",
        data: {
          file_url: uploadResult.url,
          public_id: uploadResult.public_id,
          file_size: uploadResult.bytes,
          uploaded_at: uploadResult.created_at,
          original_name: file.originalname,
        },
      });
    } catch (error) {
      console.error("Upload invoice error:", error);

      // Clean up temp file if upload failed
      if (req.file && req.file.path) {
        await cloudinaryUpload.cleanupTempFile(req.file.path).catch(() => {});
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload PDF",
        error: error.message,
        error_code: "UPLOAD_FAILED",
      });
    }
  }

  /**
   * Upload PDF from buffer (memory)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadInvoiceFromBuffer(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          error_code: "NO_FILE",
        });
      }

      const { user } = req;
      const file = req.file;

      console.log(`📂 Processing buffer upload: ${file.originalname}`);

      // Extract file info
      const fileName = path.parse(file.originalname).name;
      const timestamp = Date.now();
      const uniqueFileName = `${fileName}_${timestamp}`;

      // Upload buffer to Cloudinary
      const uploadResult = await cloudinaryUpload.uploadPDFFromBuffer(
        file.buffer,
        {
          folder: "invoices",
          fileName: uniqueFileName,
          tags: ["invoice", "pdf", `user_${user.userId}`],
          overwrite: false,
        },
      );

      // Return success response
      return res.status(200).json({
        success: true,
        message: "PDF uploaded successfully from buffer",
        data: {
          file_url: uploadResult.url,
          public_id: uploadResult.public_id,
          file_size: uploadResult.bytes,
          uploaded_at: uploadResult.created_at,
          original_name: file.originalname,
        },
      });
    } catch (error) {
      console.error("Upload invoice buffer error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to upload PDF from buffer",
        error: error.message,
        error_code: "UPLOAD_FAILED",
      });
    }
  }

  /**
   * Delete PDF file from Cloudinary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteInvoice(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: "Public ID is required",
          error_code: "MISSING_PUBLIC_ID",
        });
      }

      // Delete from Cloudinary
      const deleteResult = await cloudinaryUpload.deleteFile(publicId);

      return res.status(200).json({
        success: true,
        message: "PDF deleted successfully",
        data: deleteResult,
      });
    } catch (error) {
      console.error("Delete invoice error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete PDF",
        error: error.message,
        error_code: "DELETE_FAILED",
      });
    }
  }

  /**
   * Generate secure download URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateSecureUrl(req, res) {
    try {
      const { publicId } = req.params;
      const { expiresIn = 3600 } = req.query; // Default 1 hour

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: "Public ID is required",
          error_code: "MISSING_PUBLIC_ID",
        });
      }

      // Generate secure URL
      const secureUrl = cloudinaryUpload.generateSecureUrl(publicId, expiresIn);

      return res.status(200).json({
        success: true,
        message: "Secure URL generated successfully",
        data: {
          secure_url: secureUrl,
          expires_in: expiresIn,
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      });
    } catch (error) {
      console.error("Generate secure URL error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate secure URL",
        error: error.message,
        error_code: "URL_GENERATION_FAILED",
      });
    }
  }
}

export default new FileUploadController();
