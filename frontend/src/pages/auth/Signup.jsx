import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES, VALIDATION_MESSAGES } from "../../utils/constants.js";
import { CheckCircle } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isSignupLoading, signupError, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated]);

  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.shopName.trim())
      newErrors.shopName = VALIDATION_MESSAGES.REQUIRED;
    if (!formData.ownerName.trim())
      newErrors.ownerName = VALIDATION_MESSAGES.REQUIRED;
    if (!formData.email.trim()) newErrors.email = VALIDATION_MESSAGES.REQUIRED;
    if (!formData.mobileNumber.trim())
      newErrors.mobileNumber = VALIDATION_MESSAGES.REQUIRED;
    if (!formData.password) newErrors.password = VALIDATION_MESSAGES.REQUIRED;
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { confirmPassword, ...signupData } = formData;
    await signup(signupData);
  };

  const getErrorMessage = () => {
    if (signupError?.data?.message) return signupError.data.message;
    if (signupError?.message) return signupError.message;
    return "Signup failed. Please try again.";
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-6">WarrantyDesk</h1>

          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Apni Shop Ko Digital Banaao 🚀
          </h2>

          <p className="text-blue-100 mb-8">
            Register hatao. Smart system use karo. Sab kuch automatic.
          </p>

          <div className="space-y-4">
            {[
              "Customer search in 2 seconds",
              "Auto warranty tracking",
              "Invoice + PDF instantly",
              "WhatsApp reminders",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-300" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-blue-100">
          10+ dukaan owners already using WarrantyDesk 🚀
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Create Your Account
            </h2>
            <p className="text-gray-600 text-sm">
              Start managing your shop digitally
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            {signupError && (
              <Alert variant="error" className="mb-4">
                {getErrorMessage()}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="shopName"
                label="Shop Name"
                value={formData.shopName}
                onChange={handleInputChange}
                error={errors.shopName}
              />
              <Input
                name="ownerName"
                label="Owner Name"
                value={formData.ownerName}
                onChange={handleInputChange}
                error={errors.ownerName}
              />
              <Input
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />
              <Input
                name="mobileNumber"
                label="Mobile Number"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                error={errors.mobileNumber}
              />
              <Input
                type="password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
              />
              <Input
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
              />

              <Button
                type="submit"
                className="w-full"
                loading={isSignupLoading}
              >
                {isSignupLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <p className="text-sm text-center mt-5 text-gray-600">
              Already have an account?{" "}
              <Link to={ROUTES.LOGIN} className="text-blue-600 font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
