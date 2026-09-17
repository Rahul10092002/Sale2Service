import ShopService from "../services/shopService.js";
import cloudinaryUpload from "../services/cloudinaryUpload.js";
import Shop from "../models/Shop.js";
import { PdfRegenerationService } from "../services/pdfRegenerationService.js";
import { InvoicePDFService } from "../services/invoicePDFService.js";
import { mergePdfSettings } from "../constants/pdfSettingsDefaults.js";

const shopService = new ShopService();
const pdfRegenerationService = new PdfRegenerationService();

export const getProfile = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const result = await shopService.getShopProfile(shopId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      error_code: "SHOP_NOT_FOUND",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const updateData = req.body;
    const result = await shopService.updateShopProfile(shopId, updateData);
    return res.status(200).json({
      success: true,
      message: "Shop profile updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error_code: "UPDATE_FAILED",
    });
  }
};

export const uploadLogo = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo image uploaded",
        error_code: "NO_FILE",
      });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
        error_code: "SHOP_NOT_FOUND",
      });
    }

    if (shop.logo_public_id) {
      try {
        await cloudinaryUpload.deleteFile(shop.logo_public_id);
      } catch (deleteError) {
        // Continue even if delete fails
      }
    }

    const uploadResult = await cloudinaryUpload.uploadImageFromBuffer(
      req.file.buffer,
      {
        folder: "shop-logos",
        fileName: `shop_${shopId}_logo_${Date.now()}`,
        tags: ["shop", "logo", `shop_${shopId}`],
        transformation: [
          { width: 300, height: 300, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      },
    );

    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      {
        logo_url: uploadResult.url,
        logo_public_id: uploadResult.public_id,
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Shop logo uploaded successfully",
      data: {
        logo_url: updatedShop.logo_url,
        logo_public_id: updatedShop.logo_public_id,
        shop: updatedShop,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload shop logo",
      error: error.message,
      error_code: "UPLOAD_FAILED",
    });
  }
};

export const deleteLogo = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
        error_code: "SHOP_NOT_FOUND",
      });
    }

    if (!shop.logo_public_id) {
      return res.status(400).json({
        success: false,
        message: "No logo to delete",
        error_code: "NO_LOGO",
      });
    }

    await cloudinaryUpload.deleteFile(shop.logo_public_id);

    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      {
        logo_url: null,
        logo_public_id: null,
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Shop logo deleted successfully",
      data: updatedShop,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete shop logo",
      error: error.message,
      error_code: "DELETE_FAILED",
    });
  }
};

export const regenerateInvoicesPdf = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const userId = req.user._id || req.user.id;
    const status = await pdfRegenerationService.startBatchRegeneration(shopId, userId);
    return res.status(202).json({
      success: true,
      message: "Background PDF regeneration started",
      data: status,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to start PDF regeneration",
      error_code: statusCode === 409 ? "JOB_ALREADY_RUNNING" : "REGENERATION_FAILED",
    });
  }
};

export const getPdfRegenerationStatus = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const status = pdfRegenerationService.getStatus(shopId);
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch regeneration status",
      error: error.message,
    });
  }
};

export const previewPdfSettings = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const customPdfSettings = req.body.pdf_settings;

    const shop = await Shop.findById(shopId).lean();
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (customPdfSettings) {
      shop.pdf_settings = mergePdfSettings(customPdfSettings);
    }

    const pdfService = new InvoicePDFService();
    const pdfResult = await pdfService.generatePreviewPDF(shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="Invoice_PDF_Settings_Preview.pdf"',
    );
    return res.send(pdfResult.buffer);
  } catch (error) {
    console.error("Failed to generate PDF preview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate PDF preview",
      error: error.message,
    });
  }
};

