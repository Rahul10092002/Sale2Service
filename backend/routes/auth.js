import { Router } from "express";
import AuthController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
const authController = new AuthController();

// Public routes (no authentication required)
authRouter.post("/signup-owner", (req, res) =>
  authController.signupOwner(req, res),
);
authRouter.post("/login", (req, res) => authController.login(req, res));
// Google OAuth routes
authRouter.post("/google", (req, res) => authController.googleLogin(req, res));
authRouter.post("/signup-owner-google", (req, res) =>
  authController.signupOwnerWithGoogle(req, res),
);
authRouter.post("/signup-google-user", (req, res) =>
  authController.signupUserWithGoogle(req, res),
);

// Protected route: get current user
authRouter.get('/me', authenticate, (req, res) => authController.me(req, res))
