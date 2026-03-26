import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import { Plus, Eye, Users as UsersIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useGetUsersQuery,
  useAddUserMutation,
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

const Users = () => {
  const navigate = useNavigate();
  const { data: users = [], isLoading, error, refetch } = useGetUsersQuery();
  const [addUser] = useAddUserMutation();

  const [showAddModal, setShowAddModal] = useState(false);
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
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {/* ── Mobile Card ── */}
                <div className="md:hidden p-4 border-b border-gray-100">
                  {/* Header: icon + name + role badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="shrink-0 cursor-pointer"
                      onClick={() => navigate(`${ROUTES.USERS}/${user.id}`)}
                    >
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                        <UsersIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 leading-tight truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 mt-0.5 ${getRoleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Phone + Joined chips */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user.phone || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Joined</p>
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(user.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                    onClick={() => navigate(`${ROUTES.USERS}/${user.id}`)}
                  >
                    View Details
                  </button>
                </div>

                {/* ── Desktop Row ── */}
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4">
                  <div className="text-gray-600">{index + 1}</div>
                  <div className="flex gap-3 items-center">
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
                  <div className="text-gray-600">
                    <div className="text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-2 ${getRoleBadge(user.role)}`}
                      >
                        {user.role}
                      </span>
                      <p className="text-gray-500">
                        Created:{" "}
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded"
                    title="View Details"
                    onClick={() => navigate(`${ROUTES.USERS}/${user.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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
      </div>
    </>
  );
};

export default Users;
