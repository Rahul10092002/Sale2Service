import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Users as UsersIcon,
  Phone,
  Mail,
  MapPin,
  FileText,
  Globe,
  Calendar,
  Hash,
  Building2,
  MessageSquare,
} from "lucide-react";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
} from "../../features/customers/customerApi.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import { ROUTES } from "../../utils/constants.js";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 hover:border-gray-300";

const selectCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-700 hover:border-gray-300 cursor-pointer";

const Customers = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: response,
    isLoading,
    refetch,
  } = useGetCustomersQuery({
    page,
    limit: 10,
    search: searchTerm,
  });

  const [createCustomer] = useCreateCustomerMutation();

  const [formData, setFormData] = useState({
    full_name: "",
    whatsapp_number: "",
    alternate_phone: "",
    email: "",
    date_of_birth: "",
    anniversary_date: "",
    gst_number: "",
    customer_type: "RETAIL",
    preferred_language: "ENGLISH",
    notes: "",
    address: { line1: "", line2: "", city: "", state: "", pincode: "" },
  });

  const showAlert = (message, type = "success") => {
    dispatch(showToast({ message, type }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // support nested address fields using dot notation
    if (name && name.startsWith("address.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createCustomer(formData).unwrap();
      setShowAddModal(false);
      setFormData({
        full_name: "",
        whatsapp_number: "",
        alternate_phone: "",
        email: "",
        date_of_birth: "",
        anniversary_date: "",
        gst_number: "",
        customer_type: "RETAIL",
        preferred_language: "ENGLISH",
        notes: "",
        address: { line1: "", line2: "", city: "", state: "", pincode: "" },
      });
      showAlert("Customer created successfully", "success");
      refetch();
    } catch (err) {
      console.error(err);
      showAlert(err?.data?.message || "Failed to create customer", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customers = response?.customers || [];
  const pagination = response?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  const handlePrev = () => {
    if (pagination.page > 1) setPage((p) => p - 1);
  };
  const handleNext = () => {
    if (pagination.page < pagination.pages) setPage((p) => p + 1);
  };

  // derived pages array for rendering (small pager)
  const pagesArray = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= pagination.pages; i++) pages.push(i);
    return pages;
  }, [pagination.pages]);

  // Prepare customers section to avoid nested ternary JSX
  let customersSection = null;
  if (isLoading) {
    customersSection = <div className="p-6">Loading...</div>;
  } else if (!customers.length) {
    customersSection = (
      <div className="p-12 text-center">
        <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No customers found
        </h3>
        <p className="text-gray-500 mb-6">
          {searchTerm
            ? "No customers match your search criteria."
            : "Get started by adding your first customer."}
        </p>
        <Button onClick={() => setShowAddModal(true)}>Add Customer</Button>
      </div>
    );
  } else {
    customersSection = (
      <div className="">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-4 text-gray-500 text-sm font-semibold bg-gray-200 p-4 rounded-t-lg">
          <div>S No.</div>
          <div>Customer Details</div>
          <div>Contact Info</div>
          <div>Actions</div>
        </div>

        {/* Customer Rows */}
        {customers.map((customer, index) => (
          <div
            key={customer._id}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            {/* ── Mobile Card ── */}
            <div className="md:hidden p-4 border-b border-gray-100">
              {/* Header: icon + name + type badge */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="shrink-0 cursor-pointer"
                  onClick={() =>
                    navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)
                  }
                >
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 leading-tight truncate">
                    {customer.full_name}
                  </p>
                  {customer.gst_number && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      GST: {customer.gst_number}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 mt-0.5 ${
                    customer.customer_type === "BUSINESS"
                      ? "bg-purple-100 text-purple-700"
                      : customer.customer_type === "DEALER"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {customer.customer_type || "RETAIL"}
                </span>
              </div>

              {/* Phone + Email chips */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {customer.whatsapp_number}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {customer.email || "—"}
                  </p>
                </div>
              </div>

              {/* Address */}
              {customer.address?.line1 && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="text-xs text-gray-600">
                    {customer.address.line1}
                    {customer.address.city ? `, ${customer.address.city}` : ""}
                  </p>
                </div>
              )}

              {/* DOB / Anniversary */}
              {(customer.date_of_birth || customer.anniversary_date) && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {customer.date_of_birth && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Birthday</p>
                      <p className="text-xs font-medium text-gray-700">
                        {/* dd//mm//yyyy formart */}
                        {new Date(customer.date_of_birth).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  )}
                  {customer.anniversary_date && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">
                        Anniversary
                      </p>
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(customer.anniversary_date).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                onClick={() => navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)}
              >
                View Details
              </button>
            </div>

            {/* ── Desktop Row ── */}
            <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4">
              <div className="text-gray-600">{(page - 1) * 10 + index + 1}</div>
              <div className="flex gap-3 items-center">
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)
                  }
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-base">
                    {customer.full_name}
                  </div>
                  <p className="text-sm text-gray-600">
                    Phone: {customer.whatsapp_number}
                  </p>
                  {customer.email && (
                    <p className="text-sm text-gray-600">
                      Email: {customer.email}
                    </p>
                  )}
                  <div className="text-sm text-gray-600">
                    {customer.gst_number && <p>GST: {customer.gst_number}</p>}
                  </div>
                </div>
              </div>
              <div className="text-gray-600">
                <div className="text-sm">
                  {(customer.address?.line1 || customer.address?.city) && (
                    <p>
                      Address: {customer.address.line1}
                      {customer.address?.city && `, ${customer.address.city}`}
                    </p>
                  )}
                  {customer.date_of_birth && (
                    <p>
                      DOB:{" "}
                      {new Date(customer.date_of_birth).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                  )}
                  {customer.anniversary_date && (
                    <p>
                      Anniversary:{" "}
                      {new Date(customer.anniversary_date).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                  onClick={() =>
                    navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)
                  }
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">No customers found</div>
            <div className="text-gray-400 text-sm mt-2">
              Add your first customer to get started
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
            <div className="flex items-center space-x-4 w-[45%] min-w-62.5">
              <div className="flex items-center space-x-3 border border-gray-300 bg-white rounded-full px-4 py-2 w-full shadow-sm">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  placeholder="Search Customer by name or phone..."
                  className="bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600"
            >
              <Plus className="w-4 h-4" />
              Create Customer
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {customersSection}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 px-4 sm:px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} customers
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={pagination.page <= 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {pagesArray.map((p) => (
                  <Button
                    key={p}
                    variant={p === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="w-8 h-8 p-0 text-sm"
                  >
                    {p}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Add Customer Modal */}
          {showAddModal && (
            <Dialog
              open={showAddModal}
              onClose={() => setShowAddModal(false)}
              maxWidth="lg"
            >
              <DialogHeader onClose={() => setShowAddModal(false)}>
                Add New Customer
              </DialogHeader>
              <DialogBody>
                <form
                  id="add-customer-form"
                  onSubmit={handleAddCustomer}
                  className="space-y-4"
                >
                  {/* Basic Information */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Basic Information
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          Full Name{" "}
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          placeholder="e.g. Ramesh Kumar"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          WhatsApp Number{" "}
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                          name="whatsapp_number"
                          value={formData.whatsapp_number}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          Alternate Phone
                        </label>
                        <input
                          name="alternate_phone"
                          value={formData.alternate_phone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="customer@example.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Address
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          Address Line 1 <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="address.line1"
                          value={formData.address.line1}
                          onChange={handleInputChange}
                          placeholder="Building, Street, Area"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          Address Line 2
                        </label>
                        <input
                          name="address.line2"
                          value={formData.address.line2}
                          onChange={handleInputChange}
                          placeholder="Landmark, Near"
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          City <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleInputChange}
                          placeholder="Mumbai"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          State <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="address.state"
                          value={formData.address.state}
                          onChange={handleInputChange}
                          placeholder="Maharashtra"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          Pincode <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="address.pincode"
                          value={formData.address.pincode}
                          onChange={handleInputChange}
                          placeholder="400001"
                          className={inputCls}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile & Preferences */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Profile & Preferences
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          Customer Type
                        </label>
                        <select
                          name="customer_type"
                          value={formData.customer_type}
                          onChange={handleInputChange}
                          className={selectCls}
                        >
                          <option value="RETAIL">Retail</option>
                          <option value="BUSINESS">Business</option>
                          <option value="DEALER">Dealer</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          Preferred Language
                        </label>
                        <select
                          name="preferred_language"
                          value={formData.preferred_language}
                          onChange={handleInputChange}
                          className={selectCls}
                        >
                          <option value="ENGLISH">English</option>
                          <option value="HINDI">Hindi</option>
                          <option value="TAMIL">Tamil</option>
                          <option value="TELUGU">Telugu</option>
                          <option value="KANNADA">Kannada</option>
                          <option value="MALAYALAM">Malayalam</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Hash className="w-3.5 h-3.5 text-gray-400" />
                          GST Number
                        </label>
                        <input
                          name="gst_number"
                          value={formData.gst_number}
                          onChange={handleInputChange}
                          placeholder="22AAAAA0000A1Z5"
                          className={`${inputCls} uppercase`}
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Anniversary Date
                        </label>
                        <input
                          type="date"
                          name="anniversary_date"
                          value={formData.anniversary_date}
                          onChange={handleInputChange}
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Any additional notes about the customer..."
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </DialogBody>
              <DialogFooter>
                <div className="flex gap-3 w-full">
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
                    form="add-customer-form"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Add Customer"}
                  </Button>
                </div>
              </DialogFooter>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
};

export default Customers;
