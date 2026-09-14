import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Shop from "../models/Shop.js";
import Role from "../models/Role.js";

export default class AuthService {
  /**
   * Generate JWT token for user
   */
  generateToken(userId, shopId, role) {
    const jwtSecretKey = process.env.JWT_SECRET_KEY || "your-secret-key";

    const token = jwt.sign(
      {
        userId,
        shopId,
        role,
      },
      jwtSecretKey,
      { expiresIn: "7d" },
    );

    return token;
  }

  /**
   * Verify Google ID token and return payload
   */
  async verifyGoogleIdToken(idToken) {
    if (!idToken) throw new Error("idToken is required");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    return payload; // contains email, name, picture, sub (google id), email_verified
  }

  /**
   * Shop Owner Signup - using Google (creates shop & owner)
   */
  async signupOwnerWithGoogle(idToken, shopData) {
    const payload = await this.verifyGoogleIdToken(idToken);

    const email = payload.email;
    const name = payload.name || shopData.owner_name || "";

    if (!email) throw new Error("Google account has no email");

    const existingUser = await User.findOne({ email, deleted_at: null });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create shop
    const shop = new Shop({
      shop_name: shopData.shop_name,
      business_type: shopData.business_type,
      phone: shopData.phone || payload.phone || "",
    });
    await shop.save();

    // Create default OWNER role
    const ownerRole = new Role({
      name: "OWNER",
      permissions: ["all"],
      shop_id: shop._id,
      isDefault: true,
    });
    await ownerRole.save();

    // Create owner user with a random password
    const randomPassword = "G-" + crypto.randomBytes(8).toString("hex");

    const owner = new User({
      name,
      email,
      phone: shopData.phone || payload.phone || "",
      password: randomPassword,
      role: ownerRole._id,
      shop_id: shop._id,
    });
    await owner.save();

    const token = this.generateToken(owner._id, shop._id, "OWNER");

    return {
      user_id: owner._id,
      shop_id: shop._id,
      role: "OWNER",
      token,
    };
  }

  /**
   * Shop Owner Signup (email/password)
   * Creates a shop and an owner user, returns token and ids
   */
  async signupOwner({
    owner_name,
    email,
    phone,
    password,
    shop_name,
    business_type,
  }) {
    // Basic validation
    if (!owner_name || !email || !phone || !password || !shop_name) {
      throw new Error("Missing required fields for signup");
    }

    // Normalize
    const normalizedEmail = String(email).toLowerCase().trim();

    // Check for existing user by email or phone
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone }],
      deleted_at: null,
    });

    if (existingUser) {
      throw new Error("Email or phone already registered");
    }

    // Create shop
    const shop = new Shop({
      shop_name,
      business_type: business_type || "",
      phone,
    });
    await shop.save();

    // Create default OWNER role
    const ownerRole = new Role({
      name: "OWNER",
      permissions: ["all"],
      shop_id: shop._id,
      isDefault: true,
    });
    await ownerRole.save();

    // Create owner user
    const owner = new User({
      name: owner_name,
      email: normalizedEmail,
      phone,
      password,
      role: ownerRole._id,
      shop_id: shop._id,
    });
    await owner.save();

    // Generate JWT
    const token = this.generateToken(owner._id, shop._id, "OWNER");

    return {
      user_id: owner._id,
      shop_id: shop._id,
      role: "OWNER",
      token,
    };
  }

  /**
   * Login with Google ID token
   */
  async loginWithGoogle(idToken) {
    const payload = await this.verifyGoogleIdToken(idToken);

    const email = payload.email;
    if (!email) throw new Error("Google account has no email");

    const user = await User.findOne({ email, deleted_at: null }).populate(
      "role",
    );
    if (!user) {
      throw new Error(
        "User not found. Please sign up or contact your shop admin",
      );
    }

    const token = this.generateToken(
      user._id,
      user.shop_id,
      user.role?.name || "No Role",
    );

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role?.name || "No Role",
        permissions: user.role?.permissions || [],
        shop_id: user.shop_id,
      },
    };
  }

  /**
   * Signup a user in an existing shop using Google (shop_id required)
   */
  async signupUserWithGoogle(idToken, shopId, role = "STAFF") {
    const payload = await this.verifyGoogleIdToken(idToken);
    const email = payload.email;
    const name = payload.name || "";

    if (!email) throw new Error("Google account has no email");
    if (!shopId) throw new Error("shop_id is required to create a user");

    const shop = await Shop.findOne({ _id: shopId, deleted_at: null });
    if (!shop) throw new Error("Shop not found");

    const existingUser = await User.findOne({
      email,
      shop_id: shopId,
      deleted_at: null,
    });
    if (existingUser) {
      throw new Error("User with this email already exists in the shop");
    }

    const temporaryPassword = "G-" + crypto.randomBytes(6).toString("hex");

    const newUser = new User({
      name,
      email,
      phone: payload.phone || "",
      password: temporaryPassword,
      role,
      shop_id: shopId,
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

  normalizePhoneNumber(value) {
    if (!value) return "";

    const rawValue = String(value).trim();
    if (!rawValue) return "";

    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) return "";

    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return digitsOnly.slice(2);
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      return digitsOnly.slice(1);
    }

    return digitsOnly;
  }

  getPhoneCandidates(value) {
    const candidates = [];
    const trimmedValue = String(value || "").trim();

    if (!trimmedValue) return candidates;

    const normalized = this.normalizePhoneNumber(trimmedValue);

    candidates.push(trimmedValue);
    if (normalized) {
      candidates.push(normalized);
      if (normalized.length === 10) {
        candidates.push(`+91${normalized}`);
        candidates.push(`91${normalized}`);
      }
    }

    const digitsOnly = trimmedValue.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      candidates.push(`+91${digitsOnly}`);
      candidates.push(`91${digitsOnly}`);
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  /**
   * Login - Support email or phone
   */
  async login(emailOrPhone, password) {
    // Validate input
    if (!emailOrPhone || !password) {
      throw new Error("Email/Phone and password are required");
    }

    const phoneCandidates = this.getPhoneCandidates(emailOrPhone);

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: { $in: phoneCandidates } }],
      deleted_at: null,
    }).populate("role");

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = this.generateToken(
      user._id,
      user.shop_id,
      user.role?.name || "No Role",
    );

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role?.name || "No Role",
        permissions: user.role?.permissions || [],
        shop_id: user.shop_id,
      },
    };
  }

  /**
   * Verify Delete Security Password for shop or fallback to owner password
   */
  async verifyDeletePassword({ userId, shopId, deletePassword }) {
    if (!deletePassword) {
      throw new Error("Delete security password is required");
    }

    const shop = await Shop.findById(shopId).select("+delete_security_password");
    if (!shop) {
      throw new Error("Shop not found");
    }

    // If custom delete password is configured on Shop
    if (shop.delete_security_password) {
      const isValid = await bcrypt.compare(
        deletePassword,
        shop.delete_security_password,
      );
      return { isValid, isCustom: true };
    }

    // Fallback: Verify against user's login password
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await user.comparePassword(deletePassword);
    return { isValid, isCustom: false };
  }

  /**
   * Update or set Delete Security Password (Owner only)
   */
  async updateDeletePassword({
    userId,
    shopId,
    currentOwnerPassword,
    newDeletePassword,
  }) {
    if (!currentOwnerPassword || !newDeletePassword) {
      throw new Error(
        "Current owner password and new delete security password are required",
      );
    }

    if (newDeletePassword.length < 4) {
      throw new Error("Delete security password must be at least 4 characters long");
    }

    const user = await User.findById(userId).populate("role");
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current owner password
    const isOwnerPasswordValid = await user.comparePassword(
      currentOwnerPassword,
    );
    if (!isOwnerPasswordValid) {
      throw new Error("Incorrect owner login password");
    }

    // Hash new delete security password
    const hashedPassword = await bcrypt.hash(newDeletePassword, 10);

    // Save to Shop
    await Shop.findByIdAndUpdate(shopId, {
      delete_security_password: hashedPassword,
    });

    return { success: true };
  }

  /**
   * Check if shop has custom delete security password configured
   */
  async getDeletePasswordStatus(shopId) {
    const shop = await Shop.findById(shopId).select("+delete_security_password");
    return {
      isConfigured: !!(shop && shop.delete_security_password),
    };
  }
}
