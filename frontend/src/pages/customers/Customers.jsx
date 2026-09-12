import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions.js";
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
  Eye
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
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 dark:hover:border-slate-500";

const selectCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 dark:hover:border-slate-500 cursor-pointer";

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
    limit,
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
        <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
          No customers found
        </h3>
        <p className="text-ink-secondary dark:text-slate-400 mb-6">
          {searchTerm
            ? "No customers match your search criteria."
            : "Get started by adding your first customer."}
        </p>
        {canCreate("customers") && (
          <Button onClick={() => setShowAddModal(true)}>Add Customer</Button>
        )}
      </div>
    );
  } else {
    customersSection = (
      <div className="">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-2 text-gray-500 dark:text-slate-400 text-xs font-semibold bg-gray-200 dark:bg-dark-subtle p-4 rounded-t-lg">
          <div>S No.</div>
          <div>Customer Details</div>
          <div>Contact Info</div>
          <div>Actions</div>
        </div>

        {/* Customer Rows */}
        {customers.map((customer, index) => (
          <div
            key={customer._id}
            className={index % 2 === 0 ? "bg-white dark:bg-dark-card" : "bg-gray-50 dark:bg-dark-subtle"}
          >
            {/* ── Compact Mobile Card (Consistent with InvoiceList) ── */}
            <div
              className={`md:hidden relative px-3 py-2.5 transition-all active:bg-blue-50/40 dark:active:bg-slate-800/60 border-b border-gray-100 dark:border-dark-border/80 last:border-b-0 cursor-pointer ${
                index % 2 === 0
                  ? "bg-white dark:bg-dark-card"
                  : "bg-slate-50/60 dark:bg-slate-800/25"
              }`}
              onClick={() =>
                navigate(`${ROUTES.CUSTOMERS}/${customer._id}`, {
                  state: { from: location.pathname, label: "Customers" },
                })
              }
            >
              {/* Left type accent indicator */}
              <div
                className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
                  customer.customer_type === "BUSINESS"
                    ? "bg-purple-500"
                    : customer.customer_type === "DEALER"
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
              />

              <div className="pl-1.5">
                {/* Top Row: Customer Name & Type Badge */}
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-bold text-xs text-ink-base dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400">
                    {customer.full_name}
                  </p>
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      customer.customer_type === "BUSINESS"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : customer.customer_type === "DEALER"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {customer.customer_type || "RETAIL"}
                  </span>
                </div>

                {/* Meta Row: Phone · Email · GST */}
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 flex-wrap">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                    {customer.whatsapp_number}
                  </span>
                  {customer.email && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[130px]">{customer.email}</span>
                    </>
                  )}
                  {customer.gst_number && (
                    <>
                      <span>·</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        GST: {customer.gst_number}
                      </span>
                    </>
                  )}
                </div>

                {/* Address / Birthday single-line summary */}
                {(customer.address?.line1 || customer.date_of_birth || customer.anniversary_date) && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {customer.address?.line1 && (
                      <span className="truncate">
                        📍 {customer.address.line1}{customer.address.city ? `, ${customer.address.city}` : ""}
                      </span>
                    )}
                    {customer.date_of_birth && (
                      <span className="shrink-0 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">
                        🎂 {new Date(customer.date_of_birth).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-dark-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[10px] text-slate-400">
                      #{(page - 1) * 10 + index + 1}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-semibold"
                      onClick={() =>
                        navigate(`${ROUTES.CUSTOMERS}/${customer._id}`, {
                          state: { from: location.pathname, label: "Customers" },
                        })
                      }
                      aria-label="View Customer Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Desktop Row ── */}
            <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-2 items-center p-4">
              <div className="text-ink-secondary dark:text-slate-400">{(page - 1) * 10 + index + 1}</div>
              <div className="flex gap-3 items-center">
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    navigate(`${ROUTES.CUSTOMERS}/${customer._id}`, {
                      state: { from: location.pathname, label: "Customers" },
                    })
                  }
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-ink-base dark:text-slate-100 text-base">
                    {customer.full_name}
                  </div>
                  <p className="text-sm text-ink-secondary dark:text-slate-400">
                    Phone: {customer.whatsapp_number}
                  </p>
                  {customer.email && (
                    <p className="text-sm text-ink-secondary dark:text-slate-400">
                      Email: {customer.email}
                    </p>
                  )}
                  <div className="text-sm text-ink-secondary dark:text-slate-400">
                    {customer.gst_number && <p>GST: {customer.gst_number}</p>}
                  </div>
                </div>
              </div>
              <div className="text-ink-secondary dark:text-slate-400">
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
                    navigate(`${ROUTES.CUSTOMERS}/${customer._id}`, {
                      state: { from: location.pathname, label: "Customers" },
                    })
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
            <div className="text-ink-secondary dark:text-slate-400 text-lg">No customers found</div>
            <div className="text-ink-muted dark:text-slate-500 text-sm mt-2">
              Add your first customer to get started
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-3 sm:py-6">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-3 gap-2">
            <div className="flex items-center space-x-2 w-[45%] min-w-62.5">
              <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-1.5 w-full shadow-sm">
                <Search className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <input
                  placeholder="Search Customer by name or phone..."
                  className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-xs"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {canCreate("customers") && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-blue-500 text-blue-500 rounded-md text-xs font-medium hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Create Customer
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            {customersSection}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="px-4 sm:px-3 py-2 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input rounded-b-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-ink-muted dark:text-slate-400">
                  <span>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                    of {pagination.total} customers
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-muted dark:text-slate-400">Rows per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {pagination.pages > 1 && (
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

                    <div className="flex items-center gap-1">
                      {pagesArray.map((p) => {
                        const showPage = p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 1;
                        if (!showPage) {
                          if (p === pagination.page - 2 || p === pagination.page + 2) {
                            return <span key={p} className="px-2 py-1 text-xs text-gray-500">...</span>;
                          }
                          return null;
                        }
                        return (
                          <Button
                            key={p}
                            variant={p === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className="w-8 h-8 p-0 text-xs"
                          >
                            {p}
                          </Button>
                        );
                      })}
                    </div>

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
                )}
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
                  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 dark:bg-dark-input border-b border-gray-100 dark:border-dark-border">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-ink-secondary dark:text-slate-300 uppercase tracking-wide">
                        Basic Information
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 dark:bg-dark-input border-b border-gray-100 dark:border-dark-border">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-ink-secondary dark:text-slate-300 uppercase tracking-wide">
                        Address
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 dark:bg-dark-input border-b border-gray-100 dark:border-dark-border">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-semibold text-ink-secondary dark:text-slate-300 uppercase tracking-wide">
                        Profile & Preferences
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
                        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
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
