import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  useGetShopProfileQuery,
  useUpdateShopProfileMutation,
  useUploadShopLogoMutation,
  useDeleteShopLogoMutation,
} from "../../services/baseApi.js";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    shop_name: "",
    shop_name_hi: "",
    business_type: "",
    address: "",
    phone: "",
    gst_number: "",
    timezone: "",
    logo_url: "",
  });

  // Use RTK Query to fetch profile
  const { data, isLoading: queryLoading, error } = useGetShopProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateShopProfileMutation();
  const [uploadLogo, { isLoading: logoUploading }] =
    useUploadShopLogoMutation();
  const [deleteLogo, { isLoading: logoDeleting }] = useDeleteShopLogoMutation();
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading]);

  useEffect(() => {
    if (data && data.data) {
      setForm((prev) => ({ ...prev, ...data.data }));
    }
    if (error) {
      // global toast is handled in baseApi; optionally keep inline message
      setMessage(error?.data?.message || "Unable to load profile");
    }
  }, [data, error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      dispatch(
        showToast({ message: "Please select an image file", type: "error" }),
      );
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(
        showToast({
          message: "File size should be less than 5MB",
          type: "error",
        }),
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await uploadLogo(formData).unwrap();
      setForm((prev) => ({
        ...prev,
        logo_url: result.data.logo_url,
      }));
    } catch (error) {
      // Error handling is done in the RTK Query onQueryStarted
      console.error("Logo upload error:", error);
    }
  };

  const handleLogoDelete = async () => {
    if (!form.logo_url) return;

    try {
      await deleteLogo().unwrap();
      setForm((prev) => ({
        ...prev,
        logo_url: "",
      }));
    } catch (error) {
      // Error handling is done in the RTK Query onQueryStarted
      console.error("Logo delete error:", error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(form).unwrap();
      // updateShopProfile mutation dispatches global toast; keep optional inline message
      setMessage("Shop profile updated successfully");
    } catch (err) {
      setMessage(err?.data?.message || err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Shop Settings</h2>

        {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Shop Name (English)
            </label>
            <input
              name="shop_name"
              value={form.shop_name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Shop Name (Hindi)
            </label>
            <input
              name="shop_name_hi"
              value={form.shop_name_hi}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="दुकान का नाम"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Business Type
            </label>
            <input
              name="business_type"
              value={form.business_type}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                GST Number
              </label>
              <input
                name="gst_number"
                value={form.gst_number}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <input
                name="timezone"
                value={form.timezone}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Shop Logo</label>
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              {form.logo_url ? (
                // Logo Preview Section
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src={form.logo_url}
                      alt="Shop Logo"
                      className="w-20 h-20 object-cover rounded-lg shadow-md border"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Current Logo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Logo is set and will appear on invoices
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {logoUploading ? "Uploading..." : "Change Logo"}
                      </button>
                      <button
                        type="button"
                        onClick={handleLogoDelete}
                        disabled={logoDeleting || logoUploading}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {logoDeleting ? "Deleting..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Upload Section
                <div
                  className={`text-center transition-colors ${
                    dragOver ? "bg-indigo-50 border-indigo-300" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Upload shop logo
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Drag and drop your logo here or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports JPG, PNG up to 5MB
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {logoUploading ? "Uploading..." : "Choose File"}
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving || isUpdating}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {saving || isUpdating ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Settings;
