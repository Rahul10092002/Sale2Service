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

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Dealer Name and Phone Number are required",
      });
    }

    const newDealer = await Dealer.create({
      shop_id: shopId,
      name,
      contact_person: contact_person || "",
      phone,
      email: email || "",
      address: address || "",
      tax_id: tax_id || "",
      notes: notes || "",
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

    if (name !== undefined) dealer.name = name;
    if (contact_person !== undefined) dealer.contact_person = contact_person;
    if (phone !== undefined) dealer.phone = phone;
    if (email !== undefined) dealer.email = email;
    if (address !== undefined) dealer.address = address;
    if (tax_id !== undefined) dealer.tax_id = tax_id;
    if (notes !== undefined) dealer.notes = notes;

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
