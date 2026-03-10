import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import User from "../models/User.js";
import Shop from "../models/Shop.js";

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

    // Create owner user with a random password
    const randomPassword = "G-" + crypto.randomBytes(8).toString("hex");

    const owner = new User({
      name,
      email,
      phone: shopData.phone || payload.phone || "",
      password: randomPassword,
      role: "OWNER",
      shop_id: shop._id,
    });
    await owner.save();

    const token = this.generateToken(owner._id, shop._id, owner.role);

    return {
      user_id: owner._id,
      shop_id: shop._id,
      role: owner.role,
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

    // Create owner user
    const owner = new User({
      name: owner_name,
      email: normalizedEmail,
      phone,
      password,
      role: "OWNER",
      shop_id: shop._id,
    });
    await owner.save();

    // Generate JWT
    const token = this.generateToken(owner._id, shop._id, owner.role);

    return {
      user_id: owner._id,
      shop_id: shop._id,
      role: owner.role,
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

    const user = await User.findOne({ email, deleted_at: null });
    if (!user) {
      throw new Error(
        "User not found. Please sign up or contact your shop admin",
      );
    }

    const token = this.generateToken(user._id, user.shop_id, user.role);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
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

  /**
   * Login - Support email or phone
   */
  async login(emailOrPhone, password) {
    // Validate input
    if (!emailOrPhone || !password) {
      throw new Error("Email/Phone and password are required");
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      deleted_at: null,
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = this.generateToken(user._id, user.shop_id, user.role);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        shop_id: user.shop_id,
      },
    };
  }
}
