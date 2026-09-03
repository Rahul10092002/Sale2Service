import React, { useState } from "react";
import { X, Plus, Trash2, Edit2, Building2, Phone, Mail, MapPin, Tag } from "lucide-react";
import {
  useGetDealersQuery,
  useCreateDealerMutation,
  useUpdateDealerMutation,
  useDeleteDealerMutation,
} from "../../features/dealers/dealerApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";

const DealersModal = ({ isOpen, onClose }) => {
  const { data: response, isLoading } = useGetDealersQuery(undefined, { skip: !isOpen });
  const [createDealer, { isLoading: isCreating }] = useCreateDealerMutation();
  const [updateDealer, { isLoading: isUpdating }] = useUpdateDealerMutation();
  const [deleteDealer] = useDeleteDealerMutation();

  const [editingDealer, setEditingDealer] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    tax_id: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const dealers = response?.dealers || [];

  const handleOpenCreate = () => {
    setEditingDealer(null);
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      tax_id: "",
      notes: "",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dealer) => {
    setEditingDealer(dealer);
    setFormData({
      name: dealer.name || "",
      contact_person: dealer.contact_person || "",
      phone: dealer.phone || "",
      email: dealer.email || "",
      address: dealer.address || "",
      tax_id: dealer.tax_id || "",
      notes: dealer.notes || "",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError("Dealer Name and Phone Number are required.");
      return;
    }

    try {
      if (editingDealer) {
        await updateDealer({ id: editingDealer._id, ...formData }).unwrap();
      } else {
        await createDealer(formData).unwrap();
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || "Failed to save dealer details.");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete dealer "${name}"?`)) {
      try {
        await deleteDealer(id).unwrap();
      } catch (err) {
        alert(err?.data?.message || "Failed to delete dealer.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Dealer & Supplier Master Data
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage suppliers for stock intake and warranty RMA claims
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-md">
                  {editingDealer ? "Edit Dealer Record" : "Add New Supplier / Dealer"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-lg border border-red-200 dark:border-red-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Dealer / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ABC Battery Distributors"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. sales@abcbattery.com"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop #12, Industrial Area, Mumbai"
                    className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isCreating || isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingDealer ? "Update Dealer" : "Save Dealer"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Active Dealers: <span className="font-semibold text-gray-800 dark:text-white">{dealers.length}</span>
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Supplier
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : dealers.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                  <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No dealers saved yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Add your suppliers to easily tag incoming stock and streamline RMA claims.</p>
                  <Button size="sm" onClick={handleOpenCreate} className="bg-blue-600 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add First Dealer
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dealers.map((dealer) => (
                    <div
                      key={dealer._id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-xs hover:shadow-md transition-shadow relative group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-base">
                            {dealer.name}
                          </h4>
                          {dealer.contact_person && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              Contact: {dealer.contact_person}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEdit(dealer)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dealer._id, dealer.name)}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{dealer.phone}</span>
                        </div>
                        {dealer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{dealer.email}</span>
                          </div>
                        )}
                        {dealer.tax_id && (
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                            <span>GSTIN: <strong className="text-gray-800 dark:text-gray-200">{dealer.tax_id}</strong></span>
                          </div>
                        )}
                        {dealer.address && (
                          <div className="flex items-start gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60 mt-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="text-gray-500 dark:text-gray-400">{dealer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end rounded-b-xl">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealersModal;
