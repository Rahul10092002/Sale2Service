import Role from "../models/Role.js";

class RoleController {
  // Get all roles for a shop
  async getRoles(req, res) {
    try {
      const { shopId } = req.user;
      const roles = await Role.find({ shop_id: shopId, deleted_at: null });
      
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching roles",
        error: error.message,
      });
    }
  }

  // Create a new role
  async createRole(req, res) {
    try {
      const { shopId } = req.user;
      const { name, permissions, isDefault } = req.body;

      // Check if role name already exists for this shop
      const existingRole = await Role.findOne({
        shop_id: shopId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        deleted_at: null,
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }

      const role = new Role({
        name,
        permissions: permissions || [],
        shop_id: shopId,
        isDefault: isDefault || false,
      });

      await role.save();

      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating role",
        error: error.message,
      });
    }
  }

  // Update a role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { shopId } = req.user;
      const { name, permissions, isDefault } = req.body;

      const role = await Role.findOne({ _id: id, shop_id: shopId, deleted_at: null });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // If name is changing, check for duplicates
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({
          shop_id: shopId,
          name: { $regex: new RegExp(`^${name}$`, "i") },
          deleted_at: null,
          _id: { $ne: id },
        });

        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: "Role name already exists",
          });
        }
        role.name = name;
      }

      if (permissions) role.permissions = permissions;
      if (typeof isDefault !== "undefined") role.isDefault = isDefault;

      await role.save();

      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating role",
        error: error.message,
      });
    }
  }

  // Delete a role (soft delete)
  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const { shopId } = req.user;

      const role = await Role.findOne({ _id: id, shop_id: shopId, deleted_at: null });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Prevent deletion of default roles if needed, or check if any user is using it
      // For now, just soft delete
      role.deleted_at = new Date();
      await role.save();

      res.status(200).json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting role",
        error: error.message,
      });
    }
  }
}

export default RoleController;
