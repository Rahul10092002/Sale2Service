import UserService from "../services/userService.js";

const userService = new UserService();

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    const tempPassword = password || userService.generateTemporaryPassword();
    const result = await userService.addUser(
      { name, email, phone, role, password: tempPassword },
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
};

export const listUsers = async (req, res) => {
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
};

export const getUserById = async (req, res) => {
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
};

export const updateUser = async (req, res) => {
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
};

export const deleteUser = async (req, res) => {
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
};
