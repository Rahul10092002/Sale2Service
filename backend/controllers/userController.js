import UserService from "../service/userService.js";

const userService = new UserService();

export default class UserController {
  /**
   * Add Staff/Admin
   * POST /users
   */
  async addUser(req, res) {
    try {
      const { name, email, phone, role } = req.body;

      const result = await userService.addUser(
        { name, email, phone, role },
        req.user,
      );

      return res.status(201).json({
        success: true,
        message: "User added successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "USER_CREATION_FAILED",
      });
    }
  }

  /**
   * List all shop users
   * GET /users
   */
  async listUsers(req, res) {
    try {
      const shopId = req.user.shopId;
      const result = await userService.listUsers(shopId, req.user);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "FETCH_FAILED",
      });
    }
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const shopId = req.user.shopId;

      const result = await userService.getUserById(userId, shopId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
        error_code: "USER_NOT_FOUND",
      });
    }
  }

  /**
   * Update user
   * PUT /users/:id
   */
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const shopId = req.user.shopId;
      const { name, phone, role } = req.body;

      const result = await userService.updateUser(
        userId,
        shopId,
        { name, phone, role },
        req.user,
      );

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "UPDATE_FAILED",
      });
    }
  }

  /**
   * Delete user
   * DELETE /users/:id
   */
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      const shopId = req.user.shopId;

      const result = await userService.deleteUser(userId, shopId, req.user);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: "DELETE_FAILED",
      });
    }
  }
}
