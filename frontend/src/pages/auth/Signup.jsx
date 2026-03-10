import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES, VALIDATION_MESSAGES } from "../../utils/constants.js";

/**
 * Signup page component
 * Handles new user registration with shop details
 */
const Signup = () => {
  const navigate = useNavigate();
  const { signup, isSignupLoading, signupError, isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form state
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState({});

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

    // Clear confirm password error if passwords now match
    if (name === "password" || name === "confirmPassword") {
      if (
        name === "password" &&
        formData.confirmPassword &&
        value === formData.confirmPassword
      ) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "",
        }));
      }
      if (
        name === "confirmPassword" &&
        formData.password &&
        value === formData.password
      ) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "",
        }));
      }
    }
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate mobile number format (basic validation)
   */
  const isValidMobile = (mobile) => {
    const mobileRegex = /^[+]?[0-9]{10,15}$/;
    return mobileRegex.test(mobile.replace(/\s+/g, ""));
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    // Shop name validation
    if (!formData.shopName.trim()) {
      newErrors.shopName = VALIDATION_MESSAGES.REQUIRED;
    } else if (formData.shopName.trim().length < 3) {
      newErrors.shopName = VALIDATION_MESSAGES.SHOP_NAME_MIN_LENGTH;
    }

    // Owner name validation
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = VALIDATION_MESSAGES.REQUIRED;
    } else if (formData.ownerName.trim().length < 2) {
      newErrors.ownerName = VALIDATION_MESSAGES.OWNER_NAME_MIN_LENGTH;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = VALIDATION_MESSAGES.REQUIRED;
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = VALIDATION_MESSAGES.EMAIL_INVALID;
    }

    // Mobile number validation
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = VALIDATION_MESSAGES.REQUIRED;
    } else if (!isValidMobile(formData.mobileNumber)) {
      newErrors.mobileNumber = VALIDATION_MESSAGES.MOBILE_INVALID;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = VALIDATION_MESSAGES.REQUIRED;
    } else if (formData.password.length < 8) {
      newErrors.password = VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_MESSAGES.REQUIRED;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH;
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
      // Exclude confirmPassword from API call
      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);

      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (error) {
      console.error("Signup failed:", error);
      // Error is handled by RTK Query and displayed via signupError
    }
  };

  /**
   * Get error message from API response
   */
  const getErrorMessage = () => {
    if (signupError?.data?.message) {
      return signupError.data.message;
    }
    if (signupError?.message) {
      return signupError.message;
    }
    if (signupError?.status === 409) {
      return "An account with this email or mobile number already exists.";
    }
    if (signupError?.status >= 500) {
      return "Server error. Please try again later.";
    }
    return "Signup failed. Please try again.";
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
            Create your account
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Error message */}
          {signupError && (
            <Alert variant="error" className="mb-6">
              {getErrorMessage()}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Name */}
            <Input
              type="text"
              name="shopName"
              label="Shop Name"
              placeholder="Enter your shop name"
              value={formData.shopName}
              onChange={handleInputChange}
              error={errors.shopName}
              required
              autoComplete="organization"
            />

            {/* Owner Name */}
            <Input
              type="text"
              name="ownerName"
              label="Owner Name"
              placeholder="Enter the owner's name"
              value={formData.ownerName}
              onChange={handleInputChange}
              error={errors.ownerName}
              required
              autoComplete="name"
            />

            {/* Email */}
            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
              autoComplete="email"
            />

            {/* Mobile Number */}
            <Input
              type="tel"
              name="mobileNumber"
              label="Mobile Number (WhatsApp)"
              placeholder="Enter your mobile number"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              error={errors.mobileNumber}
              required
              autoComplete="tel"
            />

            {/* Password */}
            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="Enter your password (min 8 characters)"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              required
              autoComplete="new-password"
            />

            {/* Confirm Password */}
            <Input
              type="password"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSignupLoading}
              disabled={isSignupLoading}
              className="w-full"
            >
              {isSignupLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to={ROUTES.LOGIN}
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
