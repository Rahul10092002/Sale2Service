import User from "../models/User.js";
import crypto from "crypto";

export default class UserService {
  /**
   * Generate temporary password
   */
  generateTemporaryPassword() {
    return "Temp@" + crypto.randomBytes(4).toString("hex");
  }

  /**
   * Add Staff/Admin user
   * Only OWNER or ADMIN can add users
   */
  async addUser(userData, requestingUser) {
    const { name, email, phone, role } = userData;

    // Validate required fields
    if (!name || !email || !phone || !role) {
      throw new Error("All fields are required");
    }

    // Validate role
    if (!["STAFF", "ADMIN"].includes(role)) {
      throw new Error("Invalid role. Only STAFF or ADMIN can be added");
    }

    // OWNER can add ADMIN and STAFF
    // ADMIN can only add STAFF
    if (requestingUser.role === "ADMIN" && role === "ADMIN") {
      throw new Error("Admin users cannot create other admins");
    }

    // Check if email already exists in the shop
    const existingUser = await User.findOne({
      email,
      shop_id: requestingUser.shopId,
      deleted_at: null,
    });

    if (existingUser) {
      throw new Error("User with this email already exists in your shop");
    }

    // Generate temporary password
    const temporaryPassword = "ADMIN1234"

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password: temporaryPassword,
      role,
      shop_id: requestingUser.shopId, // Use shop_id from JWT
    });

    await newUser.save();

    return {
      user_id: newUser._id,
      temporary_password: temporaryPassword,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };
  }

  /**
   * List all users in the shop
   */
  async listUsers(shopId, requestingUser) {
    const users = await User.find({
      shop_id: shopId,
      deleted_at: null,
    }).select("_id name email phone role createdAt");

    return users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.createdAt,
    }));
  }

  /**
   * Get user by ID (within same shop)
   */
  async getUserById(userId, shopId) {
    const user = await User.findOne({
      _id: userId,
      shop_id: shopId,
      deleted_at: null,
    }).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop_id: user.shop_id,
      created_at: user.createdAt,
    };
  }

  /**
   * Update user (name, phone, role)
   * OWNER can update anyone; ADMIN can update STAFF only
   */
  async updateUser(userId, shopId, updates, requestingUser) {
    const user = await User.findOne({
      _id: userId,
      shop_id: shopId,
      deleted_at: null,
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "OWNER") {
      throw new Error("Cannot modify shop owner");
    }

    if (requestingUser.role === "ADMIN" && user.role === "ADMIN") {
      throw new Error("Admin cannot modify other admins");
    }

    const { name, phone, role } = updates;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role && ["STAFF", "ADMIN"].includes(role)) {
      if (requestingUser.role === "ADMIN" && role === "ADMIN") {
        throw new Error("Admin cannot promote users to Admin");
      }
      user.role = role;
    }

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.createdAt,
    };
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId, shopId, requestingUser) {
    const user = await User.findOne({
      _id: userId,
      shop_id: shopId,
      deleted_at: null,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Cannot delete owner
    if (user.role === "OWNER") {
      throw new Error("Cannot delete shop owner");
    }

    // ADMIN can only delete STAFF
    if (requestingUser.role === "ADMIN" && user.role === "ADMIN") {
      throw new Error("Admin cannot delete other admins");
    }

    await user.softDelete();

    return {
      message: "User deleted successfully",
    };
  }
}
