import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  Trash2,
  Plus,
  Eye,
  AlertCircle,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useGetUsersQuery,
  useAddUserMutation,
  useDeleteUserMutation,
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
  DialogFooter,
} from "../../components/ui/Modal.jsx";

const Users = () => {
  const navigate = useNavigate();
  const { data: users = [], isLoading, error, refetch } = useGetUsersQuery();
  const [addUser] = useAddUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
  });

  const showAlert = (message, type = "success") => {
    dispatch(showToast({ message, type }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await addUser(formData).unwrap();
      setShowAddModal(false);
      setFormData({ name: "", email: "", phone: "", role: "STAFF" });
      showAlert(
        `User added successfully! Temporary password: ${result.data.temporary_password}`,
        "success",
      );
      refetch();
    } catch (error) {
      showAlert(error?.data?.message || "Failed to add user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      await deleteUser(selectedUser.id).unwrap();
      setShowDeleteModal(false);
      setSelectedUser(null);
      showAlert("User deleted successfully", "success");
      refetch();
    } catch (error) {
      showAlert(error?.data?.message || "Failed to delete user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getRoleBadge = (role) => {
    const colors = {
      OWNER: "bg-purple-100 text-purple-800",
      ADMIN: "bg-blue-100 text-blue-800",
      STAFF: "bg-green-100 text-green-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          type="error"
          title="Error Loading Users"
          message={error?.data?.message || "Failed to load users"}
        />
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {/* Users management table */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Users Grid */}
        <div className="bg-white rounded-lg shadow-sm space-y-2">
          {/* Header */}
          <div className="hidden md:grid md:grid-cols-[60px_2fr_1fr_120px] gap-4 p-4 bg-gray-50 rounded-lg text-sm font-medium text-gray-500">
            <div>S.No</div>
            <div>USER DETAILS</div>
            <div>ROLE & DATE</div>
            <div>ACTION</div>
          </div>

          {/* User Rows */}
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">No users found</div>
              <div className="text-gray-400 text-sm mt-2">
                Add your first user to get started
              </div>
            </div>
          ) : (
            users.map((user, index) => (
              <div
                key={user.id}
                className={`flex flex-col md:grid md:grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4 rounded-lg ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-100"
                } mb-2 shadow-sm`}
              >
                {/* S No. */}
                <div className="text-gray-600 md:block hidden">{index + 1}</div>

                {/* User Details */}
                <div className="flex gap-3 items-center w-full md:w-auto">
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`${ROUTES.USERS}/${user.id}`)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-base">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Email: {user.email}</p>
                      <p>Phone: {user.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Role & Date */}
                <div className="text-gray-600 w-full md:w-auto">
                  <div className="text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-2 ${getRoleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                    <p className="text-gray-500">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative w-full md:w-auto flex justify-end md:justify-start">
                  <div className="flex gap-2">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded"
                      title="View Details"
                      onClick={() => navigate(`${ROUTES.USERS}/${user.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {user.role !== "OWNER" && (
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          maxWidth="xl"
        >
          <DialogHeader onClose={() => setShowAddModal(false)}>
            Add New User
          </DialogHeader>
          <DialogBody className="no-scrollbar">
            <form
              id="add-user-form"
              onSubmit={handleAddUser}
              className="space-y-4"
            >
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter email address"
              />

              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter phone number"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </form>
          </DialogBody>
          <div>
            <div className="flex gap-3 w-full py-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-user-form"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : "Add User"}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUser && (
          <Dialog
            open={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            maxWidth="xl"
          >
            <DialogHeader onClose={() => setShowDeleteModal(false)}>
              Confirm Delete
            </DialogHeader>
            <DialogBody>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-600">
                    Are you sure you want to delete{" "}
                    <span className="font-medium">{selectedUser.name}</span>?
                    This action cannot be undone.
                  </p>
                </div>
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
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : "Delete"}
                </Button>
              </div>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </>
  );
};

export default Users;
