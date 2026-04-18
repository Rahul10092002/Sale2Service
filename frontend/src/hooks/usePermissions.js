import { useSelector } from "react-redux";
import { selectCurrentUser } from "../features/auth/authSlice.js";

/**
 * Custom hook to check if the current user has a specific permission
 * @returns {Object} { hasPermission, permissions, isOwner }
 */
export const usePermissions = () => {
  const user = useSelector(selectCurrentUser);
  const permissions = user?.permissions || [];
  const roleName = user?.role || "";

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission name to check
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    // If role is OWNER or has "all" permission, automatically return true
    const isStandardOwner = roleName?.toUpperCase() === "OWNER";
    if (isStandardOwner || permissions.includes("all")) {
      return true;
    }
    return permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the provided permissions
   * @param {string[]} permissionArray - List of permission names
   * @returns {boolean}
   */
  const hasAnyPermission = (permissionArray) => {
    const isStandardOwner = roleName?.toUpperCase() === "OWNER";
    if (isStandardOwner || permissions.includes("all")) {
      return true;
    }
    return permissionArray.some(p => permissions.includes(p));
  };

  /**
   * Semantic helpers for CRUD actions
   */
  const canCreate = (module) => hasPermission(`${module}_create`);
  const canEdit = (module) => hasPermission(`${module}_edit`);
  const canDelete = (module) => hasPermission(`${module}_delete`);
  const canView = (module) => hasPermission(`${module}_view`);

  return {
    hasPermission,
    hasAnyPermission,
    canCreate,
    canEdit,
    canDelete,
    canView,
    permissions,
    isOwner: roleName?.toUpperCase() === "OWNER",
    roleName
  };
};
