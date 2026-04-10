import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit3,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../../features/users/userApi.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";
import { ROUTES } from "../../utils/constants.js";

const UserView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useGetUserByIdQuery(id);
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const dispatch = useDispatch();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "" });

  const openEditModal = () => {
    setEditForm({ name: user.name, phone: user.phone || "", role: user.role });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateUser({ id: user.id, ...editForm }).unwrap();
      setShowEditModal(false);
      dispatch(
        showToast({ message: "User updated successfully", type: "success" }),
      );
    } catch (err) {
      dispatch(
        showToast({
          message: err?.data?.message || "Failed to update user",
          type: "error",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteUser(user.id).unwrap();
      dispatch(
        showToast({ message: "User deleted successfully", type: "success" }),
      );
      navigate(ROUTES.USERS);
    } catch (err) {
      dispatch(
        showToast({
          message: err?.data?.message || "Failed to delete user",
          type: "error",
        }),
      );
    } finally {
      setIsSubmitting(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      OWNER:
        "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800",
      ADMIN:
        "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800",
      STAFF:
        "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800",
    };
    return (
      styles[role] ||
      "bg-gray-100 dark:bg-dark-subtle text-gray-800 dark:text-slate-300 border border-gray-200 dark:border-dark-border"
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Alert
          type="error"
          title="Error Loading User"
          message={error?.data?.message || "User not found"}
        />
        <Button
          onClick={() => navigate(ROUTES.USERS)}
          className="mt-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(ROUTES.USERS)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors duration-200"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Users
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <Users className="w-8 h-8 text-indigo-500" />
                      </div>
                    </div>
                    <div className="text-white flex-1 min-w-0">
                      <h2 className="text-2xl font-bold">{user.name}</h2>
                      <p className="text-indigo-100 mt-1 flex items-center gap-1 flex-wrap">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </p>
                      {user.phone && (
                        <p className="text-indigo-100 flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {user.phone}
                        </p>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-3">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Full Name
                      </label>
                      <p className="text-sm font-medium text-ink-base dark:text-slate-100">
                        {user.name}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-3">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Email Address
                      </label>
                      <p className="text-sm font-medium text-ink-base dark:text-slate-100">
                        {user.email}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-3">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Phone Number
                      </label>
                      <p className="text-sm font-medium text-ink-base dark:text-slate-100">
                        {user.phone || "—"}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-900/50">
                      <label className="block text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        Status
                      </label>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role & Permissions */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Role & Permissions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`rounded-lg p-3 border ${
                        user.role === "OWNER"
                          ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50"
                          : user.role === "ADMIN"
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50"
                            : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50"
                      }`}
                    >
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          user.role === "OWNER"
                            ? "text-purple-600 dark:text-purple-400"
                            : user.role === "ADMIN"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        Role
                      </label>
                      <p
                        className={`text-sm font-semibold ${
                          user.role === "OWNER"
                            ? "text-purple-800 dark:text-purple-200"
                            : user.role === "ADMIN"
                              ? "text-blue-800 dark:text-blue-200"
                              : "text-green-800 dark:text-green-200"
                        }`}
                      >
                        {user.role}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-3">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Created At
                      </label>
                      <p className="text-sm font-medium text-ink-base dark:text-slate-100 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                        {new Date(user.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Quick Actions */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border sticky top-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {user.role !== "OWNER" && (
                      <button
                        onClick={openEditModal}
                        className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group"
                      >
                        <div className="shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Edit3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                          Edit User
                        </span>
                      </button>
                    )}
                    {user.role !== "OWNER" && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center space-x-3 p-3 text-left border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-all duration-200 group"
                      >
                        <div className="shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-red-700 dark:text-red-400 group-hover:text-red-900 dark:group-hover:text-red-300">
                          Delete User
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="md"
      >
        <DialogHeader
          title={
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <span>Edit User</span>
            </div>
          }
          onClose={() => setShowEditModal(false)}
        />
        <DialogBody>
          <form
            id="edit-user-form"
            onSubmit={handleEditSubmit}
            className="space-y-4"
          >
            <Input
              label="Name"
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              required
              placeholder="Enter full name"
            />
            <Input
              label="Phone"
              name="phone"
              value={editForm.phone}
              onChange={handleEditChange}
              placeholder="Enter phone number"
            />
            <div>
              <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                Role
              </label>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-user-form"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxWidth="md"
      >
        <DialogHeader
          title={
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Delete User</span>
            </div>
          }
          onClose={() => setShowDeleteModal(false)}
        />
        <DialogBody>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-ink-secondary dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-ink-base dark:text-slate-100">{user.name}</span>?
              This action cannot be undone.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default UserView;
