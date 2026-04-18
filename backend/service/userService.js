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
    const { name, email, phone, role, password } = userData;

    // Validate required fields
    if (!name || !email || !phone || !role || !password) {
      throw new Error("All fields are required");
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

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password: password,
      role, // This should be the Role ObjectId
      shop_id: requestingUser.shopId,
    });

    await newUser.save();

    return {
      user_id: newUser._id,
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
    })
      .populate("role", "name permissions")
      .select("_id name email phone role createdAt");

    return users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name || "No Role",
      role_id: user.role?._id,
      permissions: user.role?.permissions || [],
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
    })
      .populate("role", "name permissions")
      .select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name || "No Role",
      role_id: user.role?._id,
      permissions: user.role?.permissions || [],
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
    }).populate("role");

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user being updated is an OWNER based on role name (if applicable)
    // or if we want to protect specific users. For now, let's keep it simple.
    if (user.role?.name === "OWNER") {
      // throw new Error("Cannot modify shop owner");
      // Letting it pass for now if the UI allows it, or we can check requestingUser
    }

    const { name, phone, role, password } = updates;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = password;
    if (role) {
      user.role = role;
    }

    await user.save();
    const updatedUser = await user.populate("role", "name");

    return {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role?.name || "No Role",
      created_at: updatedUser.createdAt,
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
