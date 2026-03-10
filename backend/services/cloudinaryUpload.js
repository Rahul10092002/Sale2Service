import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import path from "path";

/**
 * Cloudinary File Upload Service
 * Handles PDF and other file uploads to Cloudinary
 */
class CloudinaryUploadService {
  /**
   * Upload PDF file to Cloudinary
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadPDF(filePath, options = {}) {
    try {
      const {
        folder = "invoices",
        fileName = null,
        tags = ["pdf", "invoice"],
        overwrite = false,
      } = options;

      // Generate public_id if fileName is provided (without folder prefix since folder is specified separately)
      const public_id = fileName ? fileName : undefined;

      const uploadOptions = {
        resource_type: "raw", // For non-image files like PDFs
        folder,
        public_id,
        tags,
        overwrite,
        format: "pdf",
        // Add metadata for better organization
        context: {
          purpose: "invoice",
          uploaded_at: new Date().toISOString(),
        },
      };

      console.log(`📤 Uploading PDF to Cloudinary folder: ${folder}`);

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      console.log(`✅ PDF uploaded successfully: ${result.secure_url}`);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        format: result.format,
        created_at: result.created_at,
      };
    } catch (error) {
      console.error("❌ PDF upload failed:", error.message);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Upload PDF from buffer (memory)
   * @param {Buffer} buffer - PDF file buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadPDFFromBuffer(buffer, options = {}) {
    try {
      const {
        folder = "invoices",
        fileName = null,
        tags = ["pdf", "invoice"],
        overwrite = false,
      } = options;

      // Generate public_id if fileName is provided (without folder prefix since folder is specified separately)
      const public_id = fileName ? fileName : undefined;

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            folder,
            public_id,
            tags,
            overwrite,
            format: "pdf",
            context: {
              purpose: "invoice",
              uploaded_at: new Date().toISOString(),
            },
          },
          (error, result) => {
            if (error) {
              console.error("❌ PDF buffer upload failed:", error.message);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log(`✅ PDF uploaded from buffer: ${result.secure_url}`);
              resolve({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                bytes: result.bytes,
                format: result.format,
                created_at: result.created_at,
              });
            }
          },
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error("❌ PDF buffer upload failed:", error.message);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Upload image from buffer (memory) for logos/images
   * @param {Buffer} buffer - Image file buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadImageFromBuffer(buffer, options = {}) {
    try {
      const {
        folder = "images",
        fileName = null,
        tags = ["image"],
        overwrite = false,
        transformation = [],
      } = options;

      // Generate public_id if fileName is provided
      const public_id = fileName ? fileName : undefined;

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder,
            public_id,
            tags,
            overwrite,
            transformation,
            context: {
              purpose: "shop-logo",
              uploaded_at: new Date().toISOString(),
            },
          },
          (error, result) => {
            if (error) {
              console.error("❌ Image buffer upload failed:", error.message);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log(
                `✅ Image uploaded from buffer: ${result.secure_url}`,
              );
              resolve({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                bytes: result.bytes,
                format: result.format,
                width: result.width,
                height: result.height,
                created_at: result.created_at,
              });
            }
          },
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error("❌ Image buffer upload failed:", error.message);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId) {
    try {
      console.log(`🗑️ Deleting file from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });

      console.log(`✅ File deleted successfully: ${publicId}`);

      return {
        success: true,
        result: result.result,
        public_id: publicId,
      };
    } catch (error) {
      console.error("❌ File deletion failed:", error.message);
      throw new Error(`Cloudinary deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure download URL with expiration
   * @param {string} publicId - Cloudinary public ID
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {string} Secure URL with expiration
   */
  generateSecureUrl(publicId, expiresIn = 3600) {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000) + expiresIn;

      const url = cloudinary.utils.private_download_url(publicId, "pdf", {
        resource_type: "raw",
        expires_at: timestamp,
      });

      return url;
    } catch (error) {
      console.error("❌ Secure URL generation failed:", error.message);
      throw new Error(`Secure URL generation failed: ${error.message}`);
    }
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to temporary file
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🧹 Temporary file cleaned up: ${filePath}`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to cleanup temp file: ${filePath}`,
        error.message,
      );
    }
  }
}

export default new CloudinaryUploadService();
