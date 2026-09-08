import Dealer from "../models/Dealer.js";

/**
 * Get active dealers for the current shop (deleted_at is null)
 */
export const getDealers = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const dealers = await Dealer.find({
      shop_id: shopId,
      deleted_at: null,
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      dealers,
    });
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealers",
      error: error.message,
    });
  }
};

/**
 * Get all dealers including soft-deleted ones (for retroactive origin edit modals)
 */
export const getAllDealersHistory = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const dealers = await Dealer.find({
      shop_id: shopId,
    }).sort({ name: 1 });

    const formattedDealers = dealers.map((dealer) => ({
      ...dealer.toObject(),
      is_retired: Boolean(dealer.deleted_at),
    }));

    return res.status(200).json({
      success: true,
      dealers: formattedDealers,
    });
  } catch (error) {
    console.error("Error fetching dealer history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer history",
      error: error.message,
    });
  }
};

/**
 * Create a new Dealer record
 */
export const createDealer = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { name, contact_person, phone, email, address, tax_id, notes } = req.body;

    const trimmedName = (name || "").trim();
    const trimmedPhone = (phone || "").trim();
    const trimmedTaxId = (tax_id || "").trim().toUpperCase();

    if (!trimmedName || !trimmedPhone) {
      return res.status(400).json({
        success: false,
        message: "Dealer Name and Phone Number are required",
      });
    }

    // Check for duplicate active dealer by Phone Number in the same shop
    const existingByPhone = await Dealer.findOne({
      shop_id: shopId,
      phone: trimmedPhone,
      deleted_at: null,
    });
    if (existingByPhone) {
      return res.status(400).json({
        success: false,
        message: `A supplier/dealer with phone number '${trimmedPhone}' already exists (${existingByPhone.name}).`,
      });
    }

    // Check for duplicate active dealer by Name (case-insensitive) in the same shop
    const existingByName = await Dealer.findOne({
      shop_id: shopId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      deleted_at: null,
    });
    if (existingByName) {
      return res.status(400).json({
        success: false,
        message: `A supplier/dealer named '${trimmedName}' already exists.`,
      });
    }

    // Check for duplicate Tax ID / GSTIN if provided
    if (trimmedTaxId) {
      const existingByTaxId = await Dealer.findOne({
        shop_id: shopId,
        tax_id: trimmedTaxId,
        deleted_at: null,
      });
      if (existingByTaxId) {
        return res.status(400).json({
          success: false,
          message: `A supplier/dealer with GSTIN '${trimmedTaxId}' already exists (${existingByTaxId.name}).`,
        });
      }
    }

    const newDealer = await Dealer.create({
      shop_id: shopId,
      name: trimmedName,
      contact_person: (contact_person || "").trim(),
      phone: trimmedPhone,
      email: (email || "").trim().toLowerCase(),
      address: (address || "").trim(),
      tax_id: trimmedTaxId,
      notes: (notes || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Dealer created successfully",
      dealer: newDealer,
    });
  } catch (error) {
    console.error("Error creating dealer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create dealer",
      error: error.message,
    });
  }
};

/**
 * Update an existing Dealer record
 */
export const updateDealer = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { id } = req.params;
    const { name, contact_person, phone, email, address, tax_id, notes } = req.body;

    const dealer = await Dealer.findOne({ _id: id, shop_id: shopId });
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    if (phone !== undefined && phone.trim() !== dealer.phone) {
      const trimmedPhone = phone.trim();
      const existingByPhone = await Dealer.findOne({
        _id: { $ne: id },
        shop_id: shopId,
        phone: trimmedPhone,
        deleted_at: null,
      });
      if (existingByPhone) {
        return res.status(400).json({
          success: false,
          message: `Another supplier/dealer with phone number '${trimmedPhone}' already exists (${existingByPhone.name}).`,
        });
      }
      dealer.phone = trimmedPhone;
    }

    if (name !== undefined && name.trim() !== dealer.name) {
      const trimmedName = name.trim();
      const existingByName = await Dealer.findOne({
        _id: { $ne: id },
        shop_id: shopId,
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
        deleted_at: null,
      });
      if (existingByName) {
        return res.status(400).json({
          success: false,
          message: `Another supplier/dealer named '${trimmedName}' already exists.`,
        });
      }
      dealer.name = trimmedName;
    }

    if (tax_id !== undefined && tax_id.trim().toUpperCase() !== dealer.tax_id) {
      const trimmedTaxId = tax_id.trim().toUpperCase();
      if (trimmedTaxId) {
        const existingByTaxId = await Dealer.findOne({
          _id: { $ne: id },
          shop_id: shopId,
          tax_id: trimmedTaxId,
          deleted_at: null,
        });
        if (existingByTaxId) {
          return res.status(400).json({
            success: false,
            message: `Another supplier/dealer with GSTIN '${trimmedTaxId}' already exists (${existingByTaxId.name}).`,
          });
        }
      }
      dealer.tax_id = trimmedTaxId;
    }

    if (contact_person !== undefined) dealer.contact_person = contact_person.trim();
    if (email !== undefined) dealer.email = email.trim().toLowerCase();
    if (address !== undefined) dealer.address = address.trim();
    if (notes !== undefined) dealer.notes = notes.trim();

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer updated successfully",
      dealer,
    });
  } catch (error) {
    console.error("Error updating dealer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update dealer",
      error: error.message,
    });
  }
};

/**
 * Soft delete a Dealer
 */
export const deleteDealer = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { id } = req.params;

    const dealer = await Dealer.findOne({ _id: id, shop_id: shopId, deleted_at: null });
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found or already deleted",
      });
    }

    dealer.deleted_at = new Date();
    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer soft-deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting dealer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete dealer",
      error: error.message,
    });
  }
};
