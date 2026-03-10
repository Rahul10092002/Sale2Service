import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Users as UsersIcon,
} from "lucide-react";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
} from "../../features/customers/customerApi.js";
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

const Customers = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [alert, setAlert] = useState(null);
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
    notes: "",
    address: { line1: "", line2: "", city: "", state: "", pincode: "" },
  });

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
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
            className={`flex flex-col md:grid md:grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4 rounded-lg ${
              index % 2 === 0 ? "bg-white" : "bg-gray-100"
            }  shadow-sm`}
          >
            {/* S No. */}
            <div className="text-gray-600 md:block hidden">
              {(page - 1) * 10 + index + 1}
            </div>

            {/* Customer Details */}
            <div className="flex gap-3 items-center w-full md:w-auto">
              <div
                className="cursor-pointer"
                onClick={() => navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base">
                  {customer.full_name}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Type: {customer.customer_type || "RETAIL"}</p>
                  <p>GST: {customer.gst_number || "N/A"}</p>
                  <div className="md:hidden">
                    <p>Phone: {customer.whatsapp_number}</p>
                    <p>Email: {customer.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="text-gray-600 w-full md:w-auto">
              <div className="text-sm">
                <p>Phone: {customer.whatsapp_number}</p>
                <p>Email: {customer.email || "N/A"}</p>
                <p>
                  Address:{" "}
                  {customer.address?.line1
                    ? `${customer.address.line1}, ${customer.address?.city || ""}`
                    : "N/A"}
                </p>
                {customer.date_of_birth && (
                  <p>
                    DOB: {new Date(customer.date_of_birth).toLocaleDateString()}
                  </p>
                )}
                {customer.anniversary_date && (
                  <p>
                    Anniversary:{" "}
                    {new Date(customer.anniversary_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="relative w-full md:w-auto flex justify-end md:justify-start">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                onClick={() => navigate(`${ROUTES.CUSTOMERS}/${customer._id}`)}
              >
                View Details
              </button>
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
    < >
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {alert && (
            <div className="mb-6">
              <Alert
                type={alert.type}
                title={alert.type === "success" ? "Success" : "Error"}
                message={alert.message}
              />
            </div>
          )}

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
                  <Input
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="WhatsApp Number"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Alternate Phone"
                    name="alternate_phone"
                    value={formData.alternate_phone}
                    onChange={handleInputChange}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Input
                      label="Address Line 1"
                      name="address.line1"
                      value={formData.address.line1}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="Address Line 2"
                      name="address.line2"
                      value={formData.address.line2}
                      onChange={handleInputChange}
                    />
                    <Input
                      label="City"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="State"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="Pincode"
                      name="address.pincode"
                      value={formData.address.pincode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Input
                      label="GST Number"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleInputChange}
                    />
                    <Input
                      label="Date of Birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                    <Input
                      label="Anniversary Date"
                      name="anniversary_date"
                      type="date"
                      value={formData.anniversary_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Type
                    </label>
                    <select
                      name="customer_type"
                      value={formData.customer_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="BUSINESS">Business</option>
                      <option value="DEALER">Dealer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border-gray-300 p-2"
                    />
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
