import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  useGetShopProfileQuery,
  useUpdateShopProfileMutation,
  useUploadShopLogoMutation,
  useDeleteShopLogoMutation,
} from "../../services/baseApi.js";
import {
  Store,
  Phone,
  MapPin,
  FileText,
  Clock,
  ImagePlus,
  Trash2,
  Save,
  Upload,
  CheckCircle,
  Languages,
  Briefcase,
} from "lucide-react";

const FieldGroup = ({ icon: Icon, label, required, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary dark:text-slate-300">
      {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted dark:text-slate-500" />}
      {label}
      {required && <span className="text-danger">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary-dark transition-all hover:border-gray-300 dark:hover:border-slate-500";

const SectionCard = ({ title, description, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-input">
      <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100">{title}</h3>
      {description && (
        <p className="text-xs text-ink-muted dark:text-slate-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Settings = () => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const { data, isLoading: queryLoading, error } = useGetShopProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateShopProfileMutation();
  const [uploadLogo, { isLoading: logoUploading }] =
    useUploadShopLogoMutation();
  const [deleteLogo, { isLoading: logoDeleting }] = useDeleteShopLogoMutation();

  useEffect(() => {
    if (data && data.data) {
      setForm((prev) => ({ ...prev, ...data.data }));
    }
    if (error) {
      dispatch(
        showToast({
          message: error?.data?.message || "Unable to load profile",
          type: "error",
        }),
      );
    }
  }, [data, error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setSaved(false);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      dispatch(
        showToast({ message: "Please select an image file", type: "error" }),
      );
      return;
    }
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
      setForm((prev) => ({ ...prev, logo_url: result.data.logo_url }));
    } catch (err) {
      console.error("Logo upload error:", err);
    }
  };

  const handleLogoDelete = async () => {
    if (!form.logo_url) return;
    try {
      await deleteLogo().unwrap();
      setForm((prev) => ({ ...prev, logo_url: "" }));
    } catch (err) {
      console.error("Logo delete error:", err);
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
    if (file) handleLogoUpload(file);
  };
  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleLogoUpload(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(form).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      dispatch(
        showToast({
          message: err?.data?.message || err.message || "Update failed",
          type: "error",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || isUpdating;

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-base dark:text-slate-100">Shop Settings</h1>
          <p className="text-sm text-ink-muted dark:text-slate-500 mt-0.5">
            Manage your shop profile and preferences
          </p>
        </div>
        {queryLoading && (
          <span className="text-xs text-gray-400 animate-pulse mt-1">
            Loading...
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Details */}
        <SectionCard
          title="Business Details"
          description="Basic information shown on invoices and communications"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon={Store} label="Shop Name (English)" required>
                <input
                  name="shop_name"
                  value={form.shop_name}
                  onChange={handleChange}
                  placeholder="My Shop"
                  className={inputCls}
                  required
                />
              </FieldGroup>
              <FieldGroup icon={Languages} label="Shop Name (Hindi)">
                <input
                  name="shop_name_hi"
                  value={form.shop_name_hi}
                  onChange={handleChange}
                  placeholder="दुकान का नाम"
                  className={inputCls}
                />
              </FieldGroup>
            </div>
            <FieldGroup icon={Briefcase} label="Business Type">
              <input
                name="business_type"
                value={form.business_type}
                onChange={handleChange}
                placeholder="e.g. Electronics, Retail…"
                className={inputCls}
              />
            </FieldGroup>
          </div>
        </SectionCard>

        {/* Contact & Compliance */}
        <SectionCard
          title="Contact & Compliance"
          description="Contact details and regulatory information"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon={Phone} label="Phone">
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </FieldGroup>
              <FieldGroup icon={FileText} label="GST Number">
                <input
                  name="gst_number"
                  value={form.gst_number}
                  onChange={handleChange}
                  placeholder="22AAAAA0000A1Z5"
                  className={`${inputCls} uppercase`}
                />
              </FieldGroup>
            </div>
            <FieldGroup icon={Clock} label="Timezone">
              <input
                name="timezone"
                value={form.timezone}
                onChange={handleChange}
                placeholder="Asia/Kolkata"
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup icon={MapPin} label="Address">
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Shop address…"
                className={`${inputCls} resize-none`}
                rows={3}
              />
            </FieldGroup>
          </div>
        </SectionCard>

        {/* Logo */}
        <SectionCard
          title="Shop Logo"
          description="Appears on invoices and printed documents"
        >
          {form.logo_url ? (
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={form.logo_url}
                  alt="Shop Logo"
                  className="w-20 h-20 object-cover rounded-xl shadow border border-gray-100"
                />
                {logoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Logo uploaded
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Will appear on all invoices and documents
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading || logoDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {logoUploading ? "Uploading…" : "Change"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={logoDeleting || logoUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {logoDeleting ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <div
                className={`p-3 rounded-full ${dragOver ? "bg-blue-100" : "bg-white border border-gray-200"}`}
              >
                <ImagePlus
                  className={`w-6 h-6 ${dragOver ? "text-blue-500" : "text-gray-400"}`}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {logoUploading
                    ? "Uploading…"
                    : "Drop your logo here or click to browse"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG · max 5 MB
                </p>
              </div>
              {logoUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </SectionCard>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-1">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-all shadow-sm hover:shadow-md"
          >
            {isBusy ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
