import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES, VALIDATION_MESSAGES } from "../../utils/constants.js";

/**
 * Login page component
 * Handles user authentication with email/mobile and password
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoginLoading, loginError, isAuthenticated } = useAuth();
  const [showPassword, setshowPassword] = useState(false)
  // Redirect to dashboard if already authenticated
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Form state
  const [formData, setFormData] = useState({
    emailOrMobile: "",
    password: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Success message for redirected signup
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    // Email or mobile validation
    if (!formData.emailOrMobile.trim()) {
      newErrors.emailOrMobile = VALIDATION_MESSAGES.REQUIRED;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = VALIDATION_MESSAGES.REQUIRED;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (error) {
      console.error("Login failed:", error);
      // Error is handled by RTK Query and displayed via loginError
    }
  };

  /**
   * Get error message from API response
   */
  const getErrorMessage = () => {
    if (loginError?.data?.message) {
      return loginError.data.message;
    }
    if (loginError?.message) {
      return loginError.message;
    }
    if (loginError?.status === 401) {
      return "Invalid credentials. Please check your email/mobile and password.";
    }
    if (loginError?.status >= 500) {
      return "Server error. Please try again later.";
    }
    return "Login failed. Please try again.";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sales & Warranty Portal
          </h1>
          <h2 className="text-xl font-semibold text-gray-700">
            Sign in to your account
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Success message */}
          {successMessage && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
              className="mb-6"
            >
              {successMessage}
            </Alert>
          )}

          {/* Error message */}
          {loginError && (
            <Alert variant="error" className="mb-6">
              {getErrorMessage()}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email or Mobile */}
            <Input
              type="text"
              name="emailOrMobile"
              label="Email or Mobile Number"
              placeholder="Enter your email or mobile number"
              value={formData.emailOrMobile}
              onChange={handleInputChange}
              error={errors.emailOrMobile}
              required
              autoComplete="username"
            />

            {/* Password */}
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              required
              autoComplete="current-password"
            />
            <div className="flex items-center">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setshowPassword((prev) => !prev)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show-password" className="ml-2 block text-sm text-gray-900">
                Show Password
              </label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isLoginLoading}
              disabled={isLoginLoading}
              className="w-full"
            >
              {isLoginLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to={ROUTES.SIGNUP}
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
