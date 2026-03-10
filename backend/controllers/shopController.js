import ShopService from "../service/shopService.js";
import cloudinaryUpload from "../services/cloudinaryUpload.js";
import Shop from "../models/Shop.js";

const shopService = new ShopService();

export default class ShopController {
  /**
   * Get Shop Profile
   * GET /shop/profile
   */
  async getProfile(req, res) {
    try {
      // shopId comes from JWT token (req.user.shopId)
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
  }

  /**
   * Update Shop Profile
   * PUT /shop/profile
   * Only OWNER can update
   */
  async updateProfile(req, res) {
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
  }

  /**
   * Upload Shop Logo
   * POST /shop/upload-logo
   * Only OWNER can upload
   */
  async uploadLogo(req, res) {
    try {
      const shopId = req.user.shopId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No logo image uploaded",
          error_code: "NO_FILE",
        });
      }

      // Get current shop to potentially delete old logo
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
          error_code: "SHOP_NOT_FOUND",
        });
      }

      // Delete old logo if exists
      if (shop.logo_public_id) {
        try {
          await cloudinaryUpload.deleteFile(shop.logo_public_id);
        } catch (deleteError) {
          // Continue even if delete fails
        }
      }

      // Upload new logo
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

      // Update shop with new logo
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
  }

  /**
   * Delete Shop Logo
   * DELETE /shop/logo
   * Only OWNER can delete
   */
  async deleteLogo(req, res) {
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

      // Delete from Cloudinary
      await cloudinaryUpload.deleteFile(shop.logo_public_id);

      // Remove from shop
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
  }
}
