import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import { 
  Plus, 
  Eye, 
  Users as UsersIcon, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Key,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions.js";
import {
  useGetUsersQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "../../features/users/userApi.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES } from "../../utils/constants.js";
import {
  Dialog,
  DialogHeader,
  DialogBody,
} from "../../components/ui/Modal.jsx";

const AVAILABLE_PERMISSIONS = [
  // Dashboard
  { id: "dashboard_view", label: "View Dashboard", module: "Dashboard" },
  
  // Invoices
  { id: "invoices_view", label: "View Invoices", module: "Invoices" },
  { id: "invoices_create", label: "Create Invoices", module: "Invoices" },
  { id: "invoices_edit", label: "Edit Invoices", module: "Invoices" },
  { id: "invoices_delete", label: "Delete Invoices", module: "Invoices" },
  
  // Customers
  { id: "customers_view", label: "View Customers", module: "Customers" },
  { id: "customers_create", label: "Create Customers", module: "Customers" },
  { id: "customers_edit", label: "Edit Customers", module: "Customers" },
  { id: "customers_delete", label: "Delete Customers", module: "Customers" },
  
  // Products
  { id: "products_view", label: "View Products", module: "Products" },
  { id: "products_create", label: "Create Products", module: "Products" },
  { id: "products_edit", label: "Edit Products", module: "Products" },
  { id: "products_delete", label: "Delete Products", module: "Products" },
  
  // Inventory
  { id: "inventory_view", label: "View Inventory", module: "Inventory" },
  { id: "inventory_create", label: "Create Inventory Item", module: "Inventory" },
  { id: "inventory_edit", label: "Edit Inventory/Stock", module: "Inventory" },
  { id: "inventory_delete", label: "Delete Inventory Item", module: "Inventory" },
  
  // Users & Roles
  { id: "users_view", label: "View Users", module: "Users" },
  { id: "users_create", label: "Create Users", module: "Users" },
  { id: "users_edit", label: "Edit Users", module: "Users" },
  { id: "users_delete", label: "Delete Users", module: "Users" },
  { id: "roles_view", label: "View Roles", module: "Users" },
  { id: "roles_create", label: "Manage Roles", module: "Users" },

  // Logs
  { id: "logs_view", label: "View Activity Logs", module: "Logs" },

  // Schedules
  { id: "schedules_view", label: "View Schedules", module: "Schedules" },
  { id: "schedules_create", label: "Create Schedules", module: "Schedules" },
  { id: "schedules_edit", label: "Edit Schedules", module: "Schedules" },
  { id: "schedules_delete", label: "Delete Schedules", module: "Schedules" },

  // Settings
  { id: "settings_view", label: "View Settings", module: "Settings" },
  { id: "settings_edit", label: "Modify Settings", module: "Settings" },
];

const Users = () => {
  const dispatch = useDispatch();
  const { hasPermission, canCreate, canEdit, canDelete } = usePermissions();
  
  // Tabs State
  const [activeTab, setActiveTab] = useState("users"); // "users" or "roles"

  // User Queries & Mutations
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useGetUsersQuery();
  const [addUser] = useAddUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  // Role Queries & Mutations
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles } = useGetRolesQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  // Modals State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - User
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  });

  // Form State - Role
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    permissions: [],
  });

  const showAlert = (message, type = "success") => {
    dispatch(showToast({ message, type }));
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleInputChange = (e) => {
    const { name, value } = e.target;
    setRoleFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permissionId) => {
    setRoleFormData(prev => {
      const isSelected = prev.permissions.includes(permissionId);
      if (isSelected) {
        return { ...prev, permissions: prev.permissions.filter(id => id !== permissionId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permissionId] };
      }
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userFormData.role) {
      showAlert("Please select a role", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUser({ id: editingUser.id, ...userFormData }).unwrap();
        showAlert("User updated successfully", "success");
      } else {
        await addUser(userFormData).unwrap();
        showAlert("User added successfully", "success");
      }
      setShowAddUserModal(false);
      resetUserForm();
      refetchUsers();
    } catch (error) {
      showAlert(error?.data?.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name) {
      showAlert("Role name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await updateRole({ id: editingRole._id, ...roleFormData }).unwrap();
        showAlert("Role updated successfully", "success");
      } else {
        await createRole(roleFormData).unwrap();
        showAlert("Role created successfully", "success");
      }
      setShowAddRoleModal(false);
      resetRoleForm();
      refetchRoles();
    } catch (error) {
      showAlert(error?.data?.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id).unwrap();
        showAlert("User deleted successfully", "success");
        refetchUsers();
      } catch (error) {
        showAlert(error?.data?.message || "Failed to delete user", "error");
      }
    }
  };

  const handleDeleteRole = async (id) => {
    if (window.confirm("Are you sure you want to delete this role? Any users assigned to this role might lose access.")) {
      try {
        await deleteRole(id).unwrap();
        showAlert("Role deleted successfully", "success");
        refetchRoles();
      } catch (error) {
        showAlert(error?.data?.message || "Failed to delete role", "error");
      }
    }
  };

  const resetUserForm = () => {
    setUserFormData({ name: "", email: "", phone: "", role: "", password: "" });
    setEditingUser(null);
  };

  const resetRoleForm = () => {
    setRoleFormData({ name: "", permissions: [] });
    setEditingRole(null);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role_id || "",
      password: "", // Don't show existing password
    });
    setShowAddUserModal(true);
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      permissions: role.permissions || [],
    });
    setShowAddRoleModal(true);
  };

  const getRoleBadge = (roleName) => {
    const name = roleName?.toUpperCase();
    if (name === "OWNER") return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    if (name === "ADMIN") return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-base dark:text-slate-100">User Management</h1>
          <p className="text-ink-muted dark:text-slate-400">Manage your staff accounts and access permissions</p>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-dark-subtle rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "users"
                ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-ink-muted dark:text-slate-400 hover:text-ink-base"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "roles"
                ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-ink-muted dark:text-slate-400 hover:text-ink-base"
            }`}
          >
            Roles & Permissions
          </button>
        </div>
      </div>

      {activeTab === "users" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canCreate("users") && (
              <Button
                onClick={() => {
                  resetUserForm();
                  setShowAddUserModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm">
            <div className="hidden md:grid md:grid-cols-[60px_2fr_1fr_150px_100px] gap-4 p-4 bg-gray-50 dark:bg-dark-subtle border-b border-gray-100 dark:border-dark-border text-xs font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider">
              <div>S.No</div>
              <div>User Details</div>
              <div>Role</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center">
                <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-ink-secondary dark:text-slate-400">No users found</p>
              </div>
            ) : (
              users.map((user, index) => (
                <div key={user.id} className="grid grid-cols-1 md:grid-cols-[60px_2fr_1fr_150px_100px] gap-4 p-4 border-b border-gray-50 dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-dark-subtle/30 transition-colors items-center">
                  <div className="hidden md:block text-ink-muted dark:text-slate-500 text-sm">{index + 1}</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-base dark:text-slate-100 text-sm truncate">{user.name}</h4>
                      <p className="text-xs text-ink-muted dark:text-slate-500 truncate">{user.email}</p>
                      <p className="text-xs text-ink-muted dark:text-slate-500 md:hidden">{user.phone}</p>
                    </div>
                  </div>
                  <div className="flex md:block items-center justify-between">
                    <span className="md:hidden text-xs text-ink-muted font-medium">Role:</span>
                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold uppercase ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {canEdit("users") && (
                      <button 
                        onClick={() => openEditUser(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete("users") && (
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            {hasPermission("roles_create") && (
              <Button
                onClick={() => {
                  resetRoleForm();
                  setShowAddRoleModal(true);
                }}
                className="flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Create Role
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role._id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink-base dark:text-slate-100">{role.name}</h3>
                    <p className="text-xs text-ink-muted dark:text-slate-500">
                      {role.isDefault ? "System Default Role" : "Custom Shop Role"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {hasPermission("roles_create") && (
                      <button 
                        onClick={() => openEditRole(role)}
                        className="p-1 text-ink-muted hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission("roles_create") && !role.isDefault && (
                      <button 
                        onClick={() => handleDeleteRole(role._id)}
                        className="p-1 text-ink-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-ink-muted uppercase mb-2">Permissions</div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                    {role.permissions?.length > 0 ? (
                      role.permissions.map((p) => (
                        <span key={p} className="px-2 py-1 bg-gray-50 dark:bg-dark-subtle text-ink-secondary dark:text-slate-400 text-[10px] rounded-md border border-gray-100 dark:border-dark-border">
                          {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-muted italic">No permissions assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      <Dialog
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        maxWidth="lg"
      >
        <DialogHeader onClose={() => setShowAddUserModal(false)}>
          {editingUser ? "Edit User Account" : "Add New User Account"}
        </DialogHeader>
        <DialogBody>
          <form id="user-form" onSubmit={handleAddUser} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                value={userFormData.name}
                onChange={handleUserInputChange}
                required
                placeholder="John Doe"
              />
              <Input
                label="Phone Number"
                name="phone"
                value={userFormData.phone}
                onChange={handleUserInputChange}
                required
                placeholder="9876543210"
              />
            </div>
            
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={userFormData.email}
              onChange={handleUserInputChange}
              required
              disabled={!!editingUser}
              placeholder="john@example.com"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-1.5">
                  Assigned Role
                </label>
                <select
                  name="role"
                  value={userFormData.role}
                  onChange={handleUserInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role._id} value={role._id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label={editingUser ? "Reset Password (Optional)" : "Login Password"}
                name="password"
                type="password"
                value={userFormData.password}
                onChange={handleUserInputChange}
                required={!editingUser}
                placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddUserModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : (editingUser ? "Update User" : "Create User")}
              </Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>

      {/* Role Add/Edit Modal */}
      <Dialog
        open={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        maxWidth="xl"
      >
        <DialogHeader onClose={() => setShowAddRoleModal(false)}>
          {editingRole ? "Customize Role Permissions" : "Create Custom Role"}
        </DialogHeader>
        <DialogBody>
          <form id="role-form" onSubmit={handleAddRole} className="space-y-6 py-2">
            <Input
              label="Role Name"
              name="name"
              value={roleFormData.name}
              onChange={handleRoleInputChange}
              required
              placeholder="e.g. Sales Manager"
            />

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-2">
                <h4 className="text-sm font-bold text-ink-base dark:text-slate-100 uppercase tracking-widest">
                  Module Permissions
                </h4>
                <button 
                  type="button"
                  onClick={() => setRoleFormData(prev => ({ 
                    ...prev, 
                    permissions: prev.permissions.length === AVAILABLE_PERMISSIONS.length ? [] : AVAILABLE_PERMISSIONS.map(p => p.id) 
                  }))}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  {roleFormData.permissions.length === AVAILABLE_PERMISSIONS.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(
                  AVAILABLE_PERMISSIONS.reduce((acc, curr) => {
                    if (!acc[curr.module]) acc[curr.module] = [];
                    acc[curr.module].push(curr);
                    return acc;
                  }, {})
                ).map(([moduleName, modulePermissions]) => (
                  <div key={moduleName} className="space-y-3">
                    <h5 className="text-xs font-bold text-ink-muted dark:text-slate-500 uppercase tracking-wider bg-gray-50 dark:bg-dark-subtle/30 px-2 py-1 rounded w-fit">
                      {moduleName}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {modulePermissions.map((permission) => (
                        <label 
                          key={permission.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            roleFormData.permissions.includes(permission.id)
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={roleFormData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                          />
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            roleFormData.permissions.includes(permission.id)
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white dark:bg-dark-input border-gray-300 dark:border-dark-border"
                          }`}>
                            {roleFormData.permissions.includes(permission.id) && <Plus className="w-3 h-3 rotate-45" />}
                          </div>
                          <span className={`text-sm font-medium ${
                            roleFormData.permissions.includes(permission.id)
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-ink-secondary dark:text-slate-400"
                          }`}>
                            {permission.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddRoleModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : (editingRole ? "Update Role" : "Create Role")}
              </Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>
    </div>
  );
};

export default Users;


