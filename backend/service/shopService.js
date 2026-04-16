import Shop from "../models/Shop.js";

export default class ShopService {
  /**
   * Get shop profile by shop ID
   */
  async getShopProfile(shopId) {
    const shop = await Shop.findOne({
      _id: shopId,
      deleted_at: null,
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    return {
      shop_id: shop._id,
      shop_name: shop.shop_name,
      shop_name_hi: shop.shop_name_hi,
      business_type: shop.business_type,
      address: shop.address,
      phone: shop.phone,
      gst_number: shop.gst_number,
      timezone: shop.timezone,
      logo_url: shop.logo_url,
      bank_details: shop.bank_details || {},
    };
  }

  /**
   * Update shop profile (Owner only)
   */
  async updateShopProfile(shopId, updateData) {
    const {
      shop_name,
      shop_name_hi,
      address,
      phone,
      gst_number,
      timezone,
      logo_url,
      business_type,
      bank_details,
    } = updateData;

    const shop = await Shop.findOne({
      _id: shopId,
      deleted_at: null,
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Update fields if provided
    if (shop_name) shop.shop_name = shop_name;
    if (shop_name_hi) shop.shop_name_hi = shop_name_hi;
    if (address) shop.address = address;
    if (phone) shop.phone = phone;
    if (gst_number) shop.gst_number = gst_number;
    if (timezone) shop.timezone = timezone;
    if (logo_url) shop.logo_url = logo_url;
    if (business_type) shop.business_type = business_type;
    if (bank_details) {
      shop.bank_details = {
        ...(shop.bank_details || {}),
        ...bank_details,
      };
    }

    await shop.save();

    return {
      shop_id: shop._id,
      shop_name: shop.shop_name,
      shop_name_hi: shop.shop_name_hi,
      business_type: shop.business_type,
      address: shop.address,
      phone: shop.phone,
      gst_number: shop.gst_number,
      timezone: shop.timezone,
      logo_url: shop.logo_url,
      bank_details: shop.bank_details || {},
    };
  }
}
