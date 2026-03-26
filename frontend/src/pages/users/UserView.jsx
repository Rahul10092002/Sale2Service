import React from "react";
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
  UserCog,
  Settings,
} from "lucide-react";
import {
  useGetUserByIdQuery,
  useDeleteUserMutation,
} from "../../features/users/userApi.js";
import Button from "../../components/ui/Button.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES } from "../../utils/constants.js";

const UserView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useGetUserByIdQuery(id);
  const [deleteUser] = useDeleteUserMutation();
  const dispatch = useDispatch();

  const getRoleBadge = (role) => {
    const styles = {
      OWNER: "bg-purple-100 text-purple-800 border-purple-200",
      ADMIN: "bg-blue-100 text-blue-800 border-blue-200",
      STAFF: "bg-green-100 text-green-800 border-green-200",
    };
    return styles[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleDelete = async () => {
    if (!user || user.role === "OWNER") return;

    if (
      window.confirm(
        `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      )
    ) {
      try {
        await deleteUser(user.id).unwrap();
        navigate(ROUTES.USERS);
      } catch (error) {
        console.error("Failed to delete user:", error);
        dispatch(
          showToast({ message: "Failed to delete user", type: "error" }),
        );
      }
    }
  };

  const quickActions = [
    {
      icon: Edit3,
      label: "Edit User",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      action: () => navigate(`${ROUTES.USERS}/${id}/edit`),
    },
    {
      icon: UserCog,
      label: "User Settings",
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      action: () => navigate(`${ROUTES.USERS}/${id}/settings`),
    },
    {
      icon: Settings,
      label: "Permissions",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      hoverColor: "hover:bg-orange-100",
      action: () => navigate(`${ROUTES.USERS}/${id}/permissions`),
    },
  ];

  // Only show delete for non-OWNER users
  if (user && user.role !== "OWNER") {
    quickActions.push({
      icon: Trash2,
      label: "Delete User",
      color: "text-red-600",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
      action: handleDelete,
    });
  }

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Button
              onClick={() => navigate(ROUTES.USERS)}
              variant="outline"
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* User Header Card */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                    <div className="flex items-center gap-4 text-indigo-100">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {user.phone}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRoleBadge(user.role)} bg-white`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Name
                      </label>
                      <p className="text-gray-900">{user.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Phone
                      </label>
                      <p className="text-gray-900">{user.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Role & Permissions
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Role
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRoleBadge(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Created At
                      </label>
                      <p className="text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Status
                      </label>
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  User Activity
                </h3>
                <div className="text-center py-8 text-gray-500">
                  <p>User activity tracking will be available soon.</p>
                  <p className="text-sm mt-2">
                    This will include login history, recent actions, and usage
                    statistics.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg ${action.bgColor} ${action.hoverColor} transition-colors`}
                    >
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className={`text-sm font-medium ${action.color}`}>
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserView;
