import React from "react";
import {
  Heading,
  AlignLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertCircle,
  RefreshCw,
  FileCheck,
  Check,
} from "lucide-react";

const FieldGroup = ({ icon: Icon, label, required, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink-secondary dark:text-slate-300">
      {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted dark:text-slate-500" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

// Note: text-base on mobile prevents iOS/Android auto-zoom on input focus when font size < 16px
const inputCls =
  "w-full px-3.5 py-2.5 text-base sm:text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all hover:border-gray-300 dark:hover:border-slate-500";

const SectionCard = ({ title, description, badgeText, onToggleAll, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-2xs overflow-hidden">
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-input flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-bold text-ink-base dark:text-slate-100 truncate">
            {title}
          </h3>
          {badgeText && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
              {badgeText}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] sm:text-xs text-ink-muted dark:text-slate-500 mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
      {onToggleAll && (
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 shrink-0 active:scale-95 transition-transform px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50"
        >
          Toggle All
        </button>
      )}
    </div>
    <div className="p-3.5 sm:p-6">{children}</div>
  </div>
);

/**
 * Touch-First Compact Checkbox Tile
 * Built for PWA mobile screens (min 44px tap area, high visual feedback)
 */
const CheckboxTile = ({ label, description, checked, onChange }) => (
  <label
    onClick={(e) => {
      e.preventDefault();
      onChange(!checked);
    }}
    className={`group relative flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none min-h-[44px] ${
      checked
        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-100 shadow-2xs"
        : "bg-white dark:bg-dark-input/40 border-gray-200/80 dark:border-dark-border text-gray-700 dark:text-slate-300 hover:bg-gray-50/80 dark:hover:bg-dark-input"
    }`}
  >
    <div className="pt-0.5 shrink-0">
      <div
        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center transition-all ${
          checked
            ? "bg-blue-600 border-blue-600 text-white shadow-2xs scale-100"
            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent group-hover:border-blue-400"
        }`}
      >
        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
      </div>
    </div>
    <div className="flex-1 min-w-0 pr-0.5">
      <span className="text-xs sm:text-sm font-semibold leading-tight block truncate">
        {label}
      </span>
      {description && (
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 block mt-0.5 leading-snug line-clamp-1">
          {description}
        </span>
      )}
    </div>
  </label>
);

/**
 * PdfSettingsTab Component
 * Houses all PDF setting checkboxes, Header/Footer inputs, Terms Manager,
 * and Batch PDF Regeneration Card.
 */
export const PdfSettingsTab = ({
  form,
  handlePdfSettingToggle,
  handlePdfSettingTextChange,
  handleTermItemChange,
  handleAddTerm,
  handleRemoveTerm,
  handleMoveTerm,
  handleClearAllTerms,
  newTermInput,
  setNewTermInput,
  handleSaveAndRegenerateBatch,
  isJobRunning,
  currentJobStatus,
  isBatchStarting,
  isBusy,
}) => {
  // Helper for bulk section toggles
  const toggleSection = (keys) => {
    const allChecked = keys.every((k) => Boolean(form.pdf_settings?.[k]));
    const target = !allChecked;
    keys.forEach((k) => handlePdfSettingToggle(k, target));
  };

  const getActiveCount = (keys) =>
    keys.filter((k) => Boolean(form.pdf_settings?.[k])).length;

  // Group Keys
  const shopKeys = [
    "show_logo",
    "show_shop_name",
    "show_shop_address",
    "show_shop_phone",
    "show_shop_email",
    "show_shop_gst",
    "show_invoice_number",
  ];

  const customerKeys = [
    "show_customer_name",
    "show_customer_address",
    "show_customer_mobile",
    "show_customer_gst",
    "show_customer_email",
  ];

  const metadataKeys = [
    "show_invoice_date",
    "show_due_date",
    "show_payment_status",
    "show_payment_mode",
    "show_reverse_charge",
  ];

  const itemsKeys = [
    "show_qty_column",
    "show_rate_column",
    "show_taxable_column",
    "show_tax_column",
    "show_item_brand",
    "show_item_model",
    "show_item_serial",
    "show_item_warranty",
    "show_item_service_plan",
    "show_item_notes",
  ];

  const totalsKeys = [
    "show_subtotal",
    "show_discount",
    "show_exchange_price",
    "show_tax_breakdown",
    "show_amount_paid",
    "show_balance_due",
    "show_amount_in_words",
  ];

  const footerSectionKeys = [
    "show_bank_details",
    "show_upi_qr",
    "show_notes",
    "show_signature",
    "show_terms",
    "show_footer_note",
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      {/* Header Title & Footer Declaration Inputs */}
      <SectionCard
        title="Header & Footer Text Customization"
        description="Customize header title and bottom declaration note"
      >
        <div className="space-y-3 sm:space-y-4">
          <FieldGroup icon={Heading} label="Invoice Header Title">
            <input
              value={form.pdf_settings?.header_title || ""}
              onChange={(e) =>
                handlePdfSettingTextChange("header_title", e.target.value)
              }
              maxLength={50}
              placeholder="e.g. TAX INVOICE, RETAIL INVOICE, BILL OF SUPPLY"
              className={inputCls}
            />
            <span className="text-[11px] text-gray-400 justify-end flex">
              {(form.pdf_settings?.header_title || "").length} / 50 characters
            </span>
          </FieldGroup>

          <FieldGroup icon={AlignLeft} label="Footer Note / Declaration">
            <textarea
              value={form.pdf_settings?.footer_note || ""}
              onChange={(e) =>
                handlePdfSettingTextChange("footer_note", e.target.value)
              }
              maxLength={250}
              rows={2}
              placeholder="e.g. This is a computer-generated invoice."
              className={`${inputCls} resize-none`}
            />
            <span className="text-[11px] text-gray-400 justify-end flex">
              {(form.pdf_settings?.footer_note || "").length} / 250 characters
            </span>
          </FieldGroup>
        </div>
      </SectionCard>

      {/* 1. Header & Shop Details Checkboxes */}
      <SectionCard
        title="Header & Shop Info Elements"
        description="Check elements to show in the shop header"
        badgeText={`${getActiveCount(shopKeys)} / ${shopKeys.length} active`}
        onToggleAll={() => toggleSection(shopKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Shop Logo"
            description="Display shop logo image"
            checked={Boolean(form.pdf_settings?.show_logo)}
            onChange={(val) => handlePdfSettingToggle("show_logo", val)}
          />
          <CheckboxTile
            label="Shop Name"
            description="Display shop business name"
            checked={Boolean(form.pdf_settings?.show_shop_name)}
            onChange={(val) => handlePdfSettingToggle("show_shop_name", val)}
          />
          <CheckboxTile
            label="Shop Address"
            description="Display street & city address"
            checked={Boolean(form.pdf_settings?.show_shop_address)}
            onChange={(val) => handlePdfSettingToggle("show_shop_address", val)}
          />
          <CheckboxTile
            label="Shop Phone"
            description="Display shop phone number"
            checked={Boolean(form.pdf_settings?.show_shop_phone)}
            onChange={(val) => handlePdfSettingToggle("show_shop_phone", val)}
          />
          <CheckboxTile
            label="Shop Email"
            description="Display shop contact email"
            checked={Boolean(form.pdf_settings?.show_shop_email)}
            onChange={(val) => handlePdfSettingToggle("show_shop_email", val)}
          />
          <CheckboxTile
            label="Shop GSTIN"
            description="Display shop GST number"
            checked={Boolean(form.pdf_settings?.show_shop_gst)}
            onChange={(val) => handlePdfSettingToggle("show_shop_gst", val)}
          />
          <CheckboxTile
            label="Invoice Number"
            description="Display #INV-XXXXXX number"
            checked={Boolean(form.pdf_settings?.show_invoice_number)}
            onChange={(val) => handlePdfSettingToggle("show_invoice_number", val)}
          />
        </div>
      </SectionCard>

      {/* 2. Customer Info Checkboxes */}
      <SectionCard
        title="Customer Box Elements"
        description="Check details to display in Billed To section"
        badgeText={`${getActiveCount(customerKeys)} / ${customerKeys.length} active`}
        onToggleAll={() => toggleSection(customerKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Customer Name"
            description="Display customer full name"
            checked={Boolean(form.pdf_settings?.show_customer_name)}
            onChange={(val) => handlePdfSettingToggle("show_customer_name", val)}
          />
          <CheckboxTile
            label="Customer Address"
            description="Display customer address line"
            checked={Boolean(form.pdf_settings?.show_customer_address)}
            onChange={(val) => handlePdfSettingToggle("show_customer_address", val)}
          />
          <CheckboxTile
            label="Customer Mobile"
            description="Display customer phone number"
            checked={Boolean(form.pdf_settings?.show_customer_mobile)}
            onChange={(val) => handlePdfSettingToggle("show_customer_mobile", val)}
          />
          <CheckboxTile
            label="Customer GSTIN"
            description="Display customer GST number"
            checked={Boolean(form.pdf_settings?.show_customer_gst)}
            onChange={(val) => handlePdfSettingToggle("show_customer_gst", val)}
          />
          <CheckboxTile
            label="Customer Email"
            description="Display customer email ID"
            checked={Boolean(form.pdf_settings?.show_customer_email)}
            onChange={(val) => handlePdfSettingToggle("show_customer_email", val)}
          />
        </div>
      </SectionCard>

      {/* 3. Invoice Metadata Checkboxes */}
      <SectionCard
        title="Invoice Details Box Elements"
        description="Check metadata fields to include"
        badgeText={`${getActiveCount(metadataKeys)} / ${metadataKeys.length} active`}
        onToggleAll={() => toggleSection(metadataKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Invoice Date"
            description="Display date of invoice issuance"
            checked={Boolean(form.pdf_settings?.show_invoice_date)}
            onChange={(val) => handlePdfSettingToggle("show_invoice_date", val)}
          />
          <CheckboxTile
            label="Due Date"
            description="Display payment due date"
            checked={Boolean(form.pdf_settings?.show_due_date)}
            onChange={(val) => handlePdfSettingToggle("show_due_date", val)}
          />
          <CheckboxTile
            label="Payment Status"
            description="Display PAID/UNPAID status badge"
            checked={Boolean(form.pdf_settings?.show_payment_status)}
            onChange={(val) => handlePdfSettingToggle("show_payment_status", val)}
          />
          <CheckboxTile
            label="Payment Mode"
            description="Display CASH/UPI/CARD method"
            checked={Boolean(form.pdf_settings?.show_payment_mode)}
            onChange={(val) => handlePdfSettingToggle("show_payment_mode", val)}
          />
          <CheckboxTile
            label="Reverse Charge"
            description="Display Reverse Charge indicator"
            checked={Boolean(form.pdf_settings?.show_reverse_charge)}
            onChange={(val) => handlePdfSettingToggle("show_reverse_charge", val)}
          />
        </div>
      </SectionCard>

      {/* 4. Items Table & Product Specs Checkboxes */}
      <SectionCard
        title="Items Table Columns & Specs"
        description="Configure table columns and product detail lines"
        badgeText={`${getActiveCount(itemsKeys)} / ${itemsKeys.length} active`}
        onToggleAll={() => toggleSection(itemsKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Quantity Column"
            description="Show item quantity column"
            checked={Boolean(form.pdf_settings?.show_qty_column)}
            onChange={(val) => handlePdfSettingToggle("show_qty_column", val)}
          />
          <CheckboxTile
            label="Rate Column"
            description="Show unit price rate column"
            checked={Boolean(form.pdf_settings?.show_rate_column)}
            onChange={(val) => handlePdfSettingToggle("show_rate_column", val)}
          />
          <CheckboxTile
            label="Taxable Column"
            description="Show taxable subtotal column"
            checked={Boolean(form.pdf_settings?.show_taxable_column)}
            onChange={(val) => handlePdfSettingToggle("show_taxable_column", val)}
          />
          <CheckboxTile
            label="Tax Column"
            description="Show GST tax amount column"
            checked={Boolean(form.pdf_settings?.show_tax_column)}
            onChange={(val) => handlePdfSettingToggle("show_tax_column", val)}
          />
          <CheckboxTile
            label="Brand / Company"
            description="Show product manufacturer brand"
            checked={Boolean(form.pdf_settings?.show_item_brand)}
            onChange={(val) => handlePdfSettingToggle("show_item_brand", val)}
          />
          <CheckboxTile
            label="Model Number"
            description="Show item model number line"
            checked={Boolean(form.pdf_settings?.show_item_model)}
            onChange={(val) => handlePdfSettingToggle("show_item_model", val)}
          />
          <CheckboxTile
            label="Serial Number"
            description="Show S/N serial number line"
            checked={Boolean(form.pdf_settings?.show_item_serial)}
            onChange={(val) => handlePdfSettingToggle("show_item_serial", val)}
          />
          <CheckboxTile
            label="Warranty Tag"
            description="Show warranty period details"
            checked={Boolean(form.pdf_settings?.show_item_warranty)}
            onChange={(val) => handlePdfSettingToggle("show_item_warranty", val)}
          />
          <CheckboxTile
            label="Service Plan Tag"
            description="Show service plan visits info"
            checked={Boolean(form.pdf_settings?.show_item_service_plan)}
            onChange={(val) => handlePdfSettingToggle("show_item_service_plan", val)}
          />
          <CheckboxTile
            label="Item Notes"
            description="Show custom item notes line"
            checked={Boolean(form.pdf_settings?.show_item_notes)}
            onChange={(val) => handlePdfSettingToggle("show_item_notes", val)}
          />
        </div>
      </SectionCard>

      {/* 5. Totals Breakdown Checkboxes */}
      <SectionCard
        title="Totals & Summary Breakdown"
        description="Configure total amount card lines"
        badgeText={`${getActiveCount(totalsKeys)} / ${totalsKeys.length} active`}
        onToggleAll={() => toggleSection(totalsKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Subtotal Line"
            description="Show items subtotal line"
            checked={Boolean(form.pdf_settings?.show_subtotal)}
            onChange={(val) => handlePdfSettingToggle("show_subtotal", val)}
          />
          <CheckboxTile
            label="Discount Deduction"
            description="Show discount amount line"
            checked={Boolean(form.pdf_settings?.show_discount)}
            onChange={(val) => handlePdfSettingToggle("show_discount", val)}
          />
          <CheckboxTile
            label="Exchange Item"
            description="Show old item exchange deduction"
            checked={Boolean(form.pdf_settings?.show_exchange_price)}
            onChange={(val) => handlePdfSettingToggle("show_exchange_price", val)}
          />
          <CheckboxTile
            label="Tax Breakdown"
            description="Show CGST / SGST / IGST lines"
            checked={Boolean(form.pdf_settings?.show_tax_breakdown)}
            onChange={(val) => handlePdfSettingToggle("show_tax_breakdown", val)}
          />
          <CheckboxTile
            label="Amount Paid"
            description="Show partial/full paid line"
            checked={Boolean(form.pdf_settings?.show_amount_paid)}
            onChange={(val) => handlePdfSettingToggle("show_amount_paid", val)}
          />
          <CheckboxTile
            label="Balance Due"
            description="Show remaining balance due"
            checked={Boolean(form.pdf_settings?.show_balance_due)}
            onChange={(val) => handlePdfSettingToggle("show_balance_due", val)}
          />
          <CheckboxTile
            label="Amount in Words"
            description="Show formatted words line"
            checked={Boolean(form.pdf_settings?.show_amount_in_words)}
            onChange={(val) => handlePdfSettingToggle("show_amount_in_words", val)}
          />
        </div>
      </SectionCard>

      {/* 6. Bank Details, Notes & Footer Checkboxes */}
      <SectionCard
        title="Bank, Payment & Footer Sections"
        description="Configure payment card and footer section visibility"
        badgeText={`${getActiveCount(footerSectionKeys)} / ${footerSectionKeys.length} active`}
        onToggleAll={() => toggleSection(footerSectionKeys)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          <CheckboxTile
            label="Bank Details"
            description="Show bank A/C & IFSC code"
            checked={Boolean(form.pdf_settings?.show_bank_details)}
            onChange={(val) => handlePdfSettingToggle("show_bank_details", val)}
          />
          <CheckboxTile
            label="UPI QR Code"
            description="Show payment UPI QR image"
            checked={Boolean(form.pdf_settings?.show_upi_qr)}
            onChange={(val) => handlePdfSettingToggle("show_upi_qr", val)}
          />
          <CheckboxTile
            label="Invoice Notes"
            description="Show notes attached to invoice"
            checked={Boolean(form.pdf_settings?.show_notes)}
            onChange={(val) => handlePdfSettingToggle("show_notes", val)}
          />
          <CheckboxTile
            label="Authorised Signatory"
            description="Show signature block line"
            checked={Boolean(form.pdf_settings?.show_signature)}
            onChange={(val) => handlePdfSettingToggle("show_signature", val)}
          />
          <CheckboxTile
            label="Terms & Conditions"
            description="Show footer policy bullets"
            checked={Boolean(form.pdf_settings?.show_terms)}
            onChange={(val) => handlePdfSettingToggle("show_terms", val)}
          />
          <CheckboxTile
            label="Footer Note"
            description="Show bottom declaration line"
            checked={Boolean(form.pdf_settings?.show_footer_note)}
            onChange={(val) => handlePdfSettingToggle("show_footer_note", val)}
          />
        </div>
      </SectionCard>

      {/* Terms & Conditions Manager */}
      <SectionCard
        title="Terms & Conditions Bullet Points"
        description="Configure custom terms & policies printed on customer invoices (max 15)"
        badgeText={`${(form.pdf_settings?.terms_and_conditions || []).length} / 15 terms`}
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            {(form.pdf_settings?.terms_and_conditions || []).length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-dark-border text-center text-xs text-gray-400">
                No terms & conditions configured. Add a bullet point below.
              </div>
            ) : (
              (form.pdf_settings?.terms_and_conditions || []).map((term, index) => (
                <div
                  key={`term-${index}`}
                  className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-input/60"
                >
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  <input
                    value={term}
                    onChange={(e) => handleTermItemChange(index, e.target.value)}
                    maxLength={300}
                    className="flex-1 bg-transparent border-none text-base sm:text-sm text-ink-base dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded-md px-2 py-1"
                  />

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveTerm(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-gray-200/50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTerm(index, 1)}
                      disabled={
                        index ===
                        (form.pdf_settings?.terms_and_conditions || []).length - 1
                      }
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-gray-200/50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(index)}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Remove Term"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
            <input
              value={newTermInput}
              onChange={(e) => setNewTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTerm();
                }
              }}
              maxLength={300}
              placeholder="Type a new term & condition bullet point…"
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shrink-0 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add Term
            </button>
          </div>

          {(form.pdf_settings?.terms_and_conditions || []).length > 0 && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleClearAllTerms}
                className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline inline-flex items-center gap-1 min-h-[44px] px-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Terms
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Background PDF Regeneration Action Card */}
      <SectionCard
        title="Batch PDF Regeneration for Past Invoices"
        description="Regenerate past Cloudinary invoice PDFs in background"
      >
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <p className="font-semibold text-xs sm:text-sm mb-1">
                Apply Settings to Past Invoices
              </p>
              Updating PDF settings applies immediately to future invoices. Tap below to save your settings and regenerate all existing past Cloudinary invoice PDFs in the background asynchronously.
            </div>
          </div>

          {isJobRunning && currentJobStatus && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-blue-900 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  {currentJobStatus.message || "Regenerating invoice PDFs..."}
                </span>
                <span>
                  {currentJobStatus.processed} / {currentJobStatus.total} ({Math.round((currentJobStatus.processed / (currentJobStatus.total || 1)) * 100)}%)
                </span>
              </div>

              <div className="w-full bg-blue-200 dark:bg-blue-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((currentJobStatus.processed / (currentJobStatus.total || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isJobRunning || isBatchStarting || isBusy}
              onClick={handleSaveAndRegenerateBatch}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-all shadow-2xs min-h-[44px]"
            >
              {isJobRunning || isBatchStarting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Regenerating PDFs in Background…
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Save & Apply Settings to Past Invoices
                </>
              )}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default PdfSettingsTab;
