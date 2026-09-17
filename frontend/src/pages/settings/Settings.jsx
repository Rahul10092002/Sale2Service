import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import { PdfSettingsTab } from "./PdfSettingsTab.jsx";
import {
  useGetDeletePasswordStatusQuery,
  useSetDeletePasswordMutation,
} from "../../features/auth/authApi.js";
import {
  useGetShopProfileQuery,
  useUpdateShopProfileMutation,
  useUploadShopLogoMutation,
  useDeleteShopLogoMutation,
  useRegenerateInvoicesPdfMutation,
  useGetPdfRegenerationStatusQuery,
  usePreviewPdfSettingsMutation,
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
  CreditCard,
  QrCode,
  Printer,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Heading,
  AlignLeft,
  RefreshCw,
  AlertCircle,
  FileCheck,
  ExternalLink,
} from "lucide-react";

const DEFAULT_PDF_SETTINGS = {
  // Header & Shop Info
  show_logo: true,
  show_shop_name: true,
  show_shop_address: true,
  show_shop_phone: true,
  show_shop_email: true,
  show_shop_gst: true,
  header_title: "TAX INVOICE",
  show_invoice_number: true,

  // Customer Box
  show_customer_name: true,
  show_customer_address: true,
  show_customer_mobile: true,
  show_customer_gst: true,
  show_customer_email: true,

  // Invoice Details Box
  show_invoice_date: true,
  show_due_date: true,
  show_payment_status: true,
  show_payment_mode: true,
  show_reverse_charge: true,

  // Items Table Columns & Specifications
  show_hsn_column: true,
  show_qty_column: true,
  show_rate_column: true,
  show_taxable_column: true,
  show_tax_column: true,
  show_item_brand: true,
  show_item_model: true,
  show_item_serial: true,
  show_item_warranty: true,
  show_item_service_plan: true,
  show_item_notes: true,

  // Totals & Breakdown
  show_subtotal: true,
  show_discount: true,
  show_exchange_price: true,
  show_tax_breakdown: true,
  show_amount_paid: true,
  show_balance_due: true,
  show_amount_in_words: true,

  // Bank, Payment & Notes
  show_bank_details: true,
  show_upi_qr: true,
  show_notes: true,

  // Footer & Terms
  show_terms: true,
  terms_and_conditions: [
    "Goods once sold will not be taken back or exchanged without valid reason.",
    "Warranty claims are subject to manufacturer terms & conditions.",
    "Subject to local jurisdiction only.",
  ],
  show_signature: true,
  show_footer_note: true,
  footer_note: "This is a computer-generated invoice.",
};

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
  "w-full px-3.5 py-2.5 text-base sm:text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary-dark transition-all hover:border-gray-300 dark:hover:border-slate-500";

const SectionCard = ({ title, description, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-xs overflow-hidden">
    <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-input">
      <h3 className="text-xs sm:text-sm font-bold text-ink-base dark:text-slate-100">{title}</h3>
      {description && (
        <p className="text-[11px] sm:text-xs text-ink-muted dark:text-slate-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="p-3.5 sm:p-6">{children}</div>
  </div>
);

const ToggleSwitch = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/40 dark:bg-dark-input/50 hover:bg-gray-50 dark:hover:bg-dark-input transition-colors min-h-[44px]">
    <div className="pr-4">
      <div className="text-xs sm:text-sm font-medium text-ink-base dark:text-slate-200 flex items-center gap-2">
        {checked ? (
          <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <EyeOff className="w-4 h-4 text-gray-400 shrink-0" />
        )}
        {label}
      </div>
      {description && (
        <div className="text-[11px] sm:text-xs text-ink-muted dark:text-slate-500 mt-0.5">{description}</div>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general"); // "general" | "pdf"
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newTermInput, setNewTermInput] = useState("");
  const [wasJobRunning, setWasJobRunning] = useState(false);
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
    bank_details: {
      account_holder_name: "",
      account_number: "",
      bank_name: "",
      ifsc_code: "",
      upi_id: "",
    },
    pdf_settings: { ...DEFAULT_PDF_SETTINGS },
  });

  const { data, isLoading: queryLoading, error } = useGetShopProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateShopProfileMutation();
  const [uploadLogo, { isLoading: logoUploading }] =
    useUploadShopLogoMutation();
  const [deleteLogo, { isLoading: logoDeleting }] = useDeleteShopLogoMutation();

  const [regeneratePdfBatch, { isLoading: isBatchStarting }] =
    useRegenerateInvoicesPdfMutation();
  const [previewPdfSettings, { isLoading: isPreviewingPdf }] =
    usePreviewPdfSettingsMutation();

  // Poll status while job is running
  const { data: jobStatusData, refetch: refetchJobStatus } =
    useGetPdfRegenerationStatusQuery(undefined, {
      pollingInterval: wasJobRunning ? 2000 : 5000,
    });

  const currentJobStatus = jobStatusData?.data;
  const isJobRunning = Boolean(currentJobStatus?.isRunning);

  // Trigger toast on job completion
  useEffect(() => {
    if (isJobRunning) {
      setWasJobRunning(true);
    } else if (wasJobRunning && !isJobRunning) {
      setWasJobRunning(false);
      const updatedCount = currentJobStatus?.updated || 0;
      const errorCount = currentJobStatus?.errors || 0;
      dispatch(
        showToast({
          message: `✅ Past invoice PDFs regenerated! Updated ${updatedCount} PDFs (${errorCount} errors).`,
          type: errorCount > 0 ? "warning" : "success",
        }),
      );
    }
  }, [isJobRunning, wasJobRunning, currentJobStatus, dispatch]);

  useEffect(() => {
    if (data && data.data) {
      setForm((prev) => ({
        ...prev,
        ...data.data,
        pdf_settings: {
          ...DEFAULT_PDF_SETTINGS,
          ...(data.data.pdf_settings || {}),
          terms_and_conditions: Array.isArray(data.data.pdf_settings?.terms_and_conditions)
            ? [...data.data.pdf_settings.terms_and_conditions]
            : [...DEFAULT_PDF_SETTINGS.terms_and_conditions],
        },
      }));
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

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      bank_details: {
        ...(f.bank_details || {}),
        [name]: value,
      },
    }));
    setSaved(false);
  };

  const handlePdfSettingToggle = (key, value) => {
    setForm((f) => ({
      ...f,
      pdf_settings: {
        ...(f.pdf_settings || DEFAULT_PDF_SETTINGS),
        [key]: value,
      },
    }));
    setSaved(false);
  };

  const handlePdfSettingTextChange = (key, value) => {
    setForm((f) => ({
      ...f,
      pdf_settings: {
        ...(f.pdf_settings || DEFAULT_PDF_SETTINGS),
        [key]: value,
      },
    }));
    setSaved(false);
  };

  /* Terms & Conditions Handlers */
  const handleTermItemChange = (index, value) => {
    setForm((f) => {
      const currentTerms = [...(f.pdf_settings?.terms_and_conditions || [])];
      currentTerms[index] = value;
      return {
        ...f,
        pdf_settings: {
          ...f.pdf_settings,
          terms_and_conditions: currentTerms,
        },
      };
    });
    setSaved(false);
  };

  const handleAddTerm = () => {
    const trimmed = newTermInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 300) {
      dispatch(
        showToast({
          message: "Term bullet point cannot exceed 300 characters",
          type: "error",
        }),
      );
      return;
    }
    const currentTerms = form.pdf_settings?.terms_and_conditions || [];
    if (currentTerms.length >= 15) {
      dispatch(
        showToast({
          message: "Maximum 15 bullet points allowed for Terms & Conditions",
          type: "error",
        }),
      );
      return;
    }

    setForm((f) => ({
      ...f,
      pdf_settings: {
        ...f.pdf_settings,
        terms_and_conditions: [...(f.pdf_settings?.terms_and_conditions || []), trimmed],
      },
    }));
    setNewTermInput("");
    setSaved(false);
  };

  const handleRemoveTerm = (index) => {
    setForm((f) => {
      const currentTerms = (f.pdf_settings?.terms_and_conditions || []).filter(
        (_, i) => i !== index,
      );
      return {
        ...f,
        pdf_settings: {
          ...f.pdf_settings,
          terms_and_conditions: currentTerms,
        },
      };
    });
    setSaved(false);
  };

  const handleMoveTerm = (index, direction) => {
    const currentTerms = [...(form.pdf_settings?.terms_and_conditions || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentTerms.length) return;
    const temp = currentTerms[index];
    currentTerms[index] = currentTerms[targetIndex];
    currentTerms[targetIndex] = temp;
    setForm((f) => ({
      ...f,
      pdf_settings: {
        ...f.pdf_settings,
        terms_and_conditions: currentTerms,
      },
    }));
    setSaved(false);
  };

  const handleClearAllTerms = () => {
    if (window.confirm("Are you sure you want to clear all terms and conditions?")) {
      setForm((f) => ({
        ...f,
        pdf_settings: {
          ...f.pdf_settings,
          terms_and_conditions: [],
        },
      }));
      setSaved(false);
    }
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
    if (e) e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(form).unwrap();
      setSaved(true);
      dispatch(
        showToast({
          message: "Settings saved successfully!",
          type: "success",
        }),
      );
      setTimeout(() => setSaved(false), 3000);
      return true;
    } catch (err) {
      dispatch(
        showToast({
          message: err?.data?.message || err.message || "Update failed",
          type: "error",
        }),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndRegenerateBatch = async () => {
    if (isJobRunning) {
      dispatch(
        showToast({
          message: "A background PDF regeneration job is already running.",
          type: "info",
        }),
      );
      return;
    }

    if (!window.confirm("Save settings and regenerate all past invoice PDFs in Cloudinary?")) {
      return;
    }

    const savedSuccess = await handleSubmit();
    if (!savedSuccess) return;

    try {
      await regeneratePdfBatch().unwrap();
      setWasJobRunning(true);
      refetchJobStatus();
      dispatch(
        showToast({
          message: "Background PDF regeneration task started! Polling status...",
          type: "info",
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          message: err?.data?.message || "Failed to start batch regeneration",
          type: "error",
        }),
      );
    }
  };

  const handlePreviewPdfNewTab = async () => {
    try {
      const blob = await previewPdfSettings({
        pdf_settings: form.pdf_settings,
      }).unwrap();
      const pdfBlobUrl = URL.createObjectURL(blob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Unable to open PDF preview",
          type: "error",
        }),
      );
    }
  };

  const isBusy = saving || isUpdating;

  return (
    <div className="p-3 sm:p-6 max-w-4xl space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-base dark:text-slate-100">Settings</h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-500 mt-0.5">
            Manage shop profile, bank details, and granular PDF customization
          </p>
        </div>
        {queryLoading && (
          <span className="text-xs text-gray-400 animate-pulse mt-1 shrink-0">
            Loading...
          </span>
        )}
      </div>

      {/* Tabs Navigation (Scrollable on narrow mobile screens) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-dark-border pb-1 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 min-h-[44px] ${
            activeTab === "general"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-2xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100/60 dark:hover:bg-dark-input"
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>Shop & Business</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pdf")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 min-h-[44px] ${
            activeTab === "pdf"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-2xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100/60 dark:hover:bg-dark-input"
          }`}
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>PDF & Invoice Customization</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Tab 1: General & Business Settings */}
        {activeTab === "general" && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup icon={Clock} label="Timezone">
                    <input
                      name="timezone"
                      value={form.timezone}
                      onChange={handleChange}
                      placeholder="Asia/Kolkata"
                      className={inputCls}
                    />
                  </FieldGroup>
                </div>
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

            {/* Bank Details */}
            <SectionCard
              title="Bank & Payment Details"
              description="Used for automated payments and QR code on invoices"
            >
              <div className="space-y-4">
                <FieldGroup icon={CreditCard} label="Account Holder Name">
                  <input
                    name="account_holder_name"
                    value={form.bank_details?.account_holder_name || ""}
                    onChange={handleBankChange}
                    placeholder="Shop or Owner Name"
                    className={inputCls}
                  />
                </FieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup icon={Briefcase} label="Bank Name">
                    <input
                      name="bank_name"
                      value={form.bank_details?.bank_name || ""}
                      onChange={handleBankChange}
                      placeholder="State Bank of India"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup icon={FileText} label="IFSC Code">
                    <input
                      name="ifsc_code"
                      value={form.bank_details?.ifsc_code || ""}
                      onChange={handleBankChange}
                      placeholder="SBIN0001234"
                      className={`${inputCls} uppercase`}
                    />
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup icon={CreditCard} label="Account Number">
                    <input
                      name="account_number"
                      value={form.bank_details?.account_number || ""}
                      onChange={handleBankChange}
                      placeholder="1234567890"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup icon={QrCode} label="UPI ID (for QR Code)">
                    <input
                      name="upi_id"
                      value={form.bank_details?.upi_id || ""}
                      onChange={handleBankChange}
                      placeholder="shop@upi"
                      className={inputCls}
                    />
                  </FieldGroup>
                </div>
              </div>
            </SectionCard>

            {/* Logo */}
            <SectionCard
              title="Shop Logo"
              description="Appears on invoices and printed documents"
            >
              {form.logo_url ? (
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <img
                      src={form.logo_url}
                      alt="Shop Logo"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow border border-gray-100"
                    />
                    {logoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Logo uploaded
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      Will appear on all invoices and documents
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading || logoDeleting}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors min-h-[36px]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {logoUploading ? "Uploading…" : "Change"}
                      </button>
                      <button
                        type="button"
                        onClick={handleLogoDelete}
                        disabled={logoDeleting || logoUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors min-h-[36px]"
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
                  className={`relative flex flex-col items-center justify-center gap-3 py-8 sm:py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    dragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50 dark:bg-dark-input/30 dark:border-dark-border hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <div
                    className={`p-3 rounded-full ${dragOver ? "bg-blue-100" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}
                  >
                    <ImagePlus
                      className={`w-6 h-6 ${dragOver ? "text-blue-500" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                      {logoUploading
                        ? "Uploading…"
                        : "Tap or drop logo here"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
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
          </div>
        )}

        {/* Tab 2: PDF & Invoice Settings */}
        {activeTab === "pdf" && (
          <PdfSettingsTab
            form={form}
            handlePdfSettingToggle={handlePdfSettingToggle}
            handlePdfSettingTextChange={handlePdfSettingTextChange}
            handleTermItemChange={handleTermItemChange}
            handleAddTerm={handleAddTerm}
            handleRemoveTerm={handleRemoveTerm}
            handleMoveTerm={handleMoveTerm}
            handleClearAllTerms={handleClearAllTerms}
            newTermInput={newTermInput}
            setNewTermInput={setNewTermInput}
            handleSaveAndRegenerateBatch={handleSaveAndRegenerateBatch}
            isJobRunning={isJobRunning}
            currentJobStatus={currentJobStatus}
            isBatchStarting={isBatchStarting}
            isBusy={isBusy}
          />
        )}

        {/* Responsive Floating Mobile Save Bar (Stays fixed at bottom of PWA mobile screen for thumb access) */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md p-3 sm:p-0 border-t sm:border-0 border-gray-200 dark:border-dark-border shadow-lg sm:shadow-none flex items-center justify-between gap-2 sm:pt-4">
          {saved ? (
            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-green-600 font-semibold truncate">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Saved!
            </span>
          ) : (
            <span className="hidden sm:inline text-xs text-gray-400">
              Changes apply immediately to future generated invoice PDFs
            </span>
          )}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {activeTab === "pdf" && (
              <button
                type="button"
                onClick={handlePreviewPdfNewTab}
                disabled={isPreviewingPdf}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-gray-100 dark:bg-dark-input text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-dark-border min-h-[44px]"
              >
                {isPreviewingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Preview PDF</span>
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={isBusy || isJobRunning}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-all shadow-sm hover:shadow-md min-h-[44px]"
            >
              {isBusy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Protection Password Section (Shown under General tab) */}
      {activeTab === "general" && <DeleteProtectionCard />}
    </div>
  );
};

const DeleteProtectionCard = () => {
  const dispatch = useDispatch();
  const [currentOwnerPassword, setCurrentOwnerPassword] = useState("");
  const [newDeletePassword, setNewDeletePassword] = useState("");
  const [confirmDeletePassword, setConfirmDeletePassword] = useState("");

  const { data: status } = useGetDeletePasswordStatusQuery();
  const [setDeletePassword, { isLoading: loading }] =
    useSetDeletePasswordMutation();

  const isConfigured = Boolean(status?.isConfigured);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentOwnerPassword || !newDeletePassword) {
      dispatch(
        showToast({
          message: "Please fill out both password fields",
          type: "error",
        }),
      );
      return;
    }

    if (newDeletePassword !== confirmDeletePassword) {
      dispatch(
        showToast({
          message: "New delete security password and confirmation do not match",
          type: "error",
        }),
      );
      return;
    }

    if (newDeletePassword.length < 4) {
      dispatch(
        showToast({
          message: "Delete password must be at least 4 characters long",
          type: "error",
        }),
      );
      return;
    }

    try {
      const res = await setDeletePassword({
        current_owner_password: currentOwnerPassword,
        new_delete_password: newDeletePassword,
      }).unwrap();

      dispatch(
        showToast({
          message:
            res?.message || "Delete protection password updated successfully!",
          type: "success",
        }),
      );

      setCurrentOwnerPassword("");
      setNewDeletePassword("");
      setConfirmDeletePassword("");
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to update delete password",
          type: "error",
        }),
      );
    }
  };

  return (
    <SectionCard
      title="Delete Security Protection"
      description="Configure a dedicated security password required to delete invoices, customers, products, or shop data."
    >
      <div className="space-y-4">
        {/* Status Banner */}
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium ${
            isConfigured
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
          }`}
        >
          <span>
            {isConfigured
              ? "✅ Dedicated Delete Security Password is ACTIVE"
              : "⚠️ Using Default (Owner Login Password). Set a dedicated delete password below for enhanced security."}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Current Owner Login Password *
            </label>
            <input
              type="password"
              value={currentOwnerPassword}
              onChange={(e) => setCurrentOwnerPassword(e.target.value)}
              placeholder="Your account login password"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              New Delete Security Password *
            </label>
            <input
              type="password"
              value={newDeletePassword}
              onChange={(e) => setNewDeletePassword(e.target.value)}
              placeholder="Dedicated delete PIN / password"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Confirm Delete Password *
            </label>
            <input
              type="password"
              value={confirmDeletePassword}
              onChange={(e) => setConfirmDeletePassword(e.target.value)}
              placeholder="Re-type delete password"
              className={inputCls}
              required
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all shadow-xs"
            >
              {loading ? "Updating..." : "Update Delete Protection Password"}
            </button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
};

export default Settings;
