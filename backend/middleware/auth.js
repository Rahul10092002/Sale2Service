import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
        error_code: "UNAUTHORIZED",
      });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecretKey = process.env.JWT_SECRET_KEY || "your-secret-key";

    // Verify token
    const decoded = jwt.verify(token, jwtSecretKey);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      shopId: decoded.shopId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error_code: "UNAUTHORIZED",
    });
  }
};

/**
 * Role-based Authorization Middleware
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error_code: "UNAUTHORIZED",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions",
        error_code: "FORBIDDEN",
      });
    }

    next();
  };
};

/**
 * Verify user exists and is active
 */
export const verifyActiveUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.user.userId,
      deleted_at: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive",
        error_code: "USER_NOT_FOUND",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying user",
      error_code: "SERVER_ERROR",
    });
  }
};
