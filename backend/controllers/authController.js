import AuthService from "../service/authService.js";
import User from "../models/User.js";
import Shop from "../models/Shop.js";

const authService = new AuthService();

export default class AuthController {
  /**
   * Shop Owner Signup
   * POST /auth/signup-owner
   */
  async signupOwner(req, res) {
    try {
      const { owner_name, email, phone, password, shop_name, business_type } =
        req.body;

      const result = await authService.signupOwner({
        owner_name,
        email,
        phone,
        password,
        shop_name,
        business_type,
      });

      return res.status(201).json({
        success: true,
        message: "Shop created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Signup Owner Error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "SIGNUP_FAILED",
      });
    }
  }

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  async me(req, res) {
    try {
      // `authenticate` middleware must set req.user
      const { userId } = req.user || {}

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error_code: 'UNAUTHORIZED',
        })
      }

      const user = await User.findOne({ _id: userId, deleted_at: null }).select('-password')
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error_code: 'USER_NOT_FOUND',
        })
      }

      const shop = user.shop_id ? await Shop.findById(user.shop_id).select('shop_name') : null

      return res.status(200).json({
        success: true,
        message: 'User fetched',
        data: {
          user: user.toJSON ? user.toJSON() : user,
          shop: shop ? { id: shop._id, name: shop.shop_name } : null,
        },
      })
    } catch (error) {
      console.error('Get current user error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error_code: 'SERVER_ERROR',
      })
    }
  }

  /**
   * Login
   * POST /auth/login
   */
  async login(req, res) {
    try {
      const { email_or_phone, password } = req.body;

      if (!email_or_phone || !password) {
        return res.status(400).json({
          success: false,
          message: "Email/Phone and Password are required",
          error_code: "INVALID_REQUEST",
        });
      }

      const result = await authService.login(email_or_phone, password);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
        error_code: "LOGIN_FAILED",
      });
    }
  }

  /**
   * Google Login
   * POST /auth/google
   * Body: { id_token }
   */
  async googleLogin(req, res) {
    try {
      const { id_token } = req.body;
      if (!id_token) {
        return res
          .status(400)
          .json({
            success: false,
            message: "id_token is required",
            error_code: "INVALID_REQUEST",
          });
      }

      const result = await authService.loginWithGoogle(id_token);

      return res
        .status(200)
        .json({ success: true, message: "Login successful", data: result });
    } catch (error) {
      return res
        .status(401)
        .json({
          success: false,
          message: error.message,
          error_code: "GOOGLE_LOGIN_FAILED",
        });
    }
  }

  /**
   * Google Signup Owner
   * POST /auth/signup-owner-google
   * Body: { id_token, shop_name, business_type, phone }
   */
  async signupOwnerWithGoogle(req, res) {
    try {
      const { id_token, shop_name, business_type, phone } = req.body;
      if (!id_token || !shop_name) {
        return res
          .status(400)
          .json({
            success: false,
            message: "id_token and shop_name are required",
            error_code: "INVALID_REQUEST",
          });
      }

      const result = await authService.signupOwnerWithGoogle(id_token, {
        shop_name,
        business_type,
        phone,
      });

      return res
        .status(201)
        .json({
          success: true,
          message: "Shop created successfully",
          data: result,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: error.message,
          error_code: "GOOGLE_SIGNUP_FAILED",
        });
    }
  }

  /**
   * Google Signup User in existing shop
   * POST /auth/signup-google-user
   * Body: { id_token, shop_id, role }
   */
  async signupUserWithGoogle(req, res) {
    try {
      const { id_token, shop_id, role } = req.body;
      if (!id_token || !shop_id) {
        return res
          .status(400)
          .json({
            success: false,
            message: "id_token and shop_id are required",
            error_code: "INVALID_REQUEST",
          });
      }

      const result = await authService.signupUserWithGoogle(
        id_token,
        shop_id,
        role,
      );
      return res
        .status(201)
        .json({
          success: true,
          message: "User created successfully",
          data: result,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: error.message,
          error_code: "GOOGLE_SIGNUP_USER_FAILED",
        });
    }
  }
}
