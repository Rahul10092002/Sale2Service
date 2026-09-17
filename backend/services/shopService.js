import Shop from "../models/Shop.js";
import { mergePdfSettings } from "../constants/pdfSettingsDefaults.js";

const formatShopProfile = (shop) => ({
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
  pdf_settings: mergePdfSettings(shop.pdf_settings),
});

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

    return formatShopProfile(shop);
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
      pdf_settings,
    } = updateData;

    const shop = await Shop.findOne({
      _id: shopId,
      deleted_at: null,
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Update fields if provided
    if (shop_name !== undefined) shop.shop_name = shop_name;
    if (shop_name_hi !== undefined) shop.shop_name_hi = shop_name_hi;
    if (address !== undefined) shop.address = address;
    if (phone !== undefined) shop.phone = phone;
    if (gst_number !== undefined) shop.gst_number = gst_number;
    if (timezone !== undefined) shop.timezone = timezone;
    if (logo_url !== undefined) shop.logo_url = logo_url;
    if (business_type !== undefined) shop.business_type = business_type;
    if (bank_details !== undefined) {
      shop.bank_details = {
        ...(shop.bank_details || {}),
        ...bank_details,
      };
    }

    if (pdf_settings !== undefined && typeof pdf_settings === "object" && pdf_settings !== null) {
      const current = mergePdfSettings(shop.pdf_settings);
      const updated = { ...current };

      Object.keys(pdf_settings).forEach((key) => {
        if (typeof pdf_settings[key] === "boolean") {
          updated[key] = pdf_settings[key];
        }
      });

      if (typeof pdf_settings.header_title === "string") {
        if (pdf_settings.header_title.length > 50) {
          throw new Error("Header title cannot exceed 50 characters");
        }
        updated.header_title = pdf_settings.header_title;
      }

      if (typeof pdf_settings.footer_note === "string") {
        if (pdf_settings.footer_note.length > 250) {
          throw new Error("Footer note cannot exceed 250 characters");
        }
        updated.footer_note = pdf_settings.footer_note;
      }

      if (Array.isArray(pdf_settings.terms_and_conditions)) {
        if (pdf_settings.terms_and_conditions.length > 15) {
          throw new Error("Cannot add more than 15 terms and conditions bullet points");
        }
        const cleanedTerms = pdf_settings.terms_and_conditions
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean);

        for (const term of cleanedTerms) {
          if (term.length > 300) {
            throw new Error("Each term bullet point cannot exceed 300 characters");
          }
        }
        updated.terms_and_conditions = cleanedTerms;
      }

      shop.pdf_settings = updated;
    }

    await shop.save();

    return formatShopProfile(shop);
  }
}
