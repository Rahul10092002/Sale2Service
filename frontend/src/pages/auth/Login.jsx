import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES, VALIDATION_MESSAGES } from "../../utils/constants.js";
import { CheckCircle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoginLoading, loginError, isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated]);

  const [formData, setFormData] = useState({
    emailOrMobile: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setshowPassword] = useState(false);

  useEffect(() => {
    if (location.state?.message) setSuccessMessage(location.state.message);
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.emailOrMobile.trim())
      newErrors.emailOrMobile = VALIDATION_MESSAGES.REQUIRED;
    if (!formData.password) newErrors.password = VALIDATION_MESSAGES.REQUIRED;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    await login(formData);
  };

  const getErrorMessage = () => {
    if (loginError?.data?.message) return loginError.data.message;
    if (loginError?.message) return loginError.message;
    return "Login failed. Please try again.";
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE (Brand + Features) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 flex-col justify-between">
        {/* Logo */}
        <div>
          <h1 className="text-2xl font-bold mb-6">WarrantyDesk</h1>

          <h2 className="text-3xl font-bold leading-tight mb-4">
            Register Bandh. Business Smart.
          </h2>

          <p className="text-blue-100 mb-8">
            Billing, warranty tracking aur customer history — sab ek jagah.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              "2 sec mein customer search",
              "Auto warranty alerts",
              "Invoice + PDF + WhatsApp ready",
              "Cloud backup – data safe",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-300" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust */}
        <p className="text-sm text-blue-100">
          Trusted by 10+ shop owners across India 🚀
        </p>
      </div>

      {/* RIGHT SIDE (Login Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome Back 👋
            </h2>
            <p className="text-gray-600 text-sm">
              Login to continue your dashboard
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            {successMessage && (
              <Alert variant="success" className="mb-4">
                {successMessage}
              </Alert>
            )}

            {loginError && (
              <Alert variant="error" className="mb-4">
                {getErrorMessage()}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="text"
                name="emailOrMobile"
                label="Email or Mobile"
                placeholder="Enter email or mobile"
                value={formData.emailOrMobile}
                onChange={handleInputChange}
                error={errors.emailOrMobile}
              />

              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                label="Password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setshowPassword((p) => !p)}
                  />
                  Show password
                </label>

                <span className="text-blue-600 cursor-pointer hover:underline">
                  Forgot?
                </span>
              </div>

              <Button type="submit" className="w-full" loading={isLoginLoading}>
                {isLoginLoading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <p className="text-sm text-center mt-5 text-gray-600">
              Don’t have an account?{" "}
              <Link to={ROUTES.SIGNUP} className="text-blue-600 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
