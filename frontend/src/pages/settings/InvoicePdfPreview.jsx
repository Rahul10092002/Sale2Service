import React from "react";
import {
  FileText,
  QrCode,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Wrench,
  Tag,
  Hash,
} from "lucide-react";

/**
 * InvoicePdfPreview Component
 * Renders a live, interactive A4-proportioned dummy PDF invoice preview
 * that updates in real-time as the shop owner toggles options or edits text in settings.
 * Fully supports product items AND service items with service warranties & service plans!
 */
export const InvoicePdfPreview = ({ form, zoomLevel = 100 }) => {
  const pdf = form?.pdf_settings || {};
  const bank = form?.bank_details || {};

  // Shop Fallbacks
  const shopName = form?.shop_name || "Apex Electronics & Services";
  const shopAddress = form?.address || "Shop #12, Tech Market, Ring Road, Delhi 110001";
  const shopPhone = form?.phone || "+91 98765 43210";
  const shopEmail = "contact@apexelectronics.com";
  const shopGst = form?.gst_number || "07AAAAA0000A1Z5";
  const logoUrl = form?.logo_url;

  // Header Title & Footer Note
  const headerTitle = pdf.header_title || "TAX INVOICE";
  const footerNote = pdf.footer_note || "This is a computer-generated invoice.";

  // Dummy Items Data (Products + Service Item for full preview fidelity)
  const items = [
    {
      name: "Luminous 150Ah Inverter Battery",
      brand: "Luminous",
      model: "ILTT18048",
      serial: "LUM-8849-X92",
      isService: false,
      warranty: "36 Months Warranty",
      servicePlan: "2 Free Maintenance Visits/Year",
      notes: "Heavy-duty tubular battery. Handle upright.",
      hsn: "85072000",
      qty: 1,
      rate: 14500,
      taxable: 14500,
      gstRate: 18,
      gstAmt: 2610,
      total: 17110,
    },
    {
      name: "Solar & Inverter Wiring & Health Checkup Service",
      brand: "Apex Care",
      isService: true,
      serviceCategory: "MAINTENANCE & REPAIR",
      serviceWarranty: "90 Days Labor Guarantee",
      servicePlan: "Annual AMC Plan (4 Visits)",
      notes: "Includes 25-point safety checkup, earthing test & load balancing.",
      hsn: "998714",
      qty: 1,
      rate: 1800,
      taxable: 1800,
      gstRate: 18,
      gstAmt: 324,
      total: 2124,
    },
    {
      name: "Microtek 1000VA Sine Wave Inverter",
      brand: "Microtek",
      model: "SW-1000",
      serial: "MIC-2026-901",
      isService: false,
      warranty: "24 Months Warranty",
      servicePlan: null,
      notes: "Pure sine wave system",
      hsn: "85044090",
      qty: 1,
      rate: 7500,
      taxable: 7500,
      gstRate: 18,
      gstAmt: 1350,
      total: 8850,
    },
  ];

  // Dynamic visible columns count for responsive table header & cell spanning
  let colCount = 2; // S.No + Item Description always present
  if (pdf.show_hsn_column !== false) colCount++;
  if (pdf.show_qty_column !== false) colCount++;
  if (pdf.show_rate_column !== false) colCount++;
  if (pdf.show_taxable_column !== false) colCount++;
  if (pdf.show_tax_column !== false) colCount++;
  colCount++; // Total column always present

  return (
    <div className="w-full flex justify-center overflow-x-auto py-2">
      <div
        className="transition-transform duration-200 origin-top w-full min-w-[620px] max-w-[840px]"
        style={{ transform: `scale(${zoomLevel / 100})` }}
      >
        {/* Paper Container */}
        <div className="bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-200 p-6 sm:p-8 text-[11px] leading-snug font-sans tracking-tight select-none">
          
          {/* Top Decorative Preview Watermark Ribbon */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
              Live Invoice PDF Preview
            </span>
            <span className="text-[10px] text-slate-400 font-medium">A4 Standard Format</span>
          </div>

          {/* 1. Header Section */}
          <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b border-slate-200">
            {/* Brand Left */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {pdf.show_logo !== false && (
                <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building2 className="w-7 h-7 text-slate-400" />
                  )}
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                {pdf.show_shop_name !== false && (
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                    {shopName}
                  </h1>
                )}
                {pdf.show_shop_address !== false && (
                  <p className="text-[10.5px] text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    {shopAddress}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 pt-0.5">
                  {pdf.show_shop_phone !== false && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {shopPhone}
                    </span>
                  )}
                  {pdf.show_shop_email !== false && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {shopEmail}
                    </span>
                  )}
                  {pdf.show_shop_gst !== false && (
                    <span className="font-semibold text-slate-700">
                      GSTIN: {shopGst}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Right (Title & Invoice No) */}
            <div className="text-right shrink-0">
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                {headerTitle}
              </h2>
              {pdf.show_invoice_number !== false && (
                <div className="font-mono text-xs font-bold text-blue-600 tracking-wider mt-0.5">
                  #INV-2026-0089
                </div>
              )}
              {pdf.show_payment_status !== false && (
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[9px] uppercase tracking-wider">
                    PAID
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Details Grid (Customer Box & Invoice Details) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Customer Box */}
            <div className="p-3 rounded-md bg-slate-50/70 border border-slate-200/90 space-y-1">
              <div className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                Billed To (Customer Details)
              </div>
              {pdf.show_customer_name !== false && (
                <div className="text-xs font-bold text-slate-900">
                  Rahul Sharma
                </div>
              )}
              {pdf.show_customer_address !== false && (
                <div className="text-[10px] text-slate-600">
                  Flat 402, Royal Residency, Sector 14, Dwarka, New Delhi
                </div>
              )}
              {pdf.show_customer_mobile !== false && (
                <div className="text-[10px] text-slate-600 flex items-center gap-1">
                  <span className="text-slate-400">Mobile:</span> +91 98112 34567
                </div>
              )}
              {pdf.show_customer_email !== false && (
                <div className="text-[10px] text-slate-600 flex items-center gap-1">
                  <span className="text-slate-400">Email:</span> rahul.sharma@example.com
                </div>
              )}
              {pdf.show_customer_gst !== false && (
                <div className="text-[10px] font-medium text-slate-700 flex items-center gap-1">
                  <span className="text-slate-400">GSTIN:</span> 07BBBPS9081F1ZD
                </div>
              )}
            </div>

            {/* Invoice Details Box */}
            <div className="p-3 rounded-md bg-slate-50/70 border border-slate-200/90 space-y-1">
              <div className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                Invoice Reference
              </div>
              {pdf.show_invoice_date !== false && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Invoice Date:</span>
                  <span className="font-semibold text-slate-800">17 Sep 2026</span>
                </div>
              )}
              {pdf.show_due_date !== false && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Payment Due Date:</span>
                  <span className="font-semibold text-slate-800">24 Sep 2026</span>
                </div>
              )}
              {pdf.show_payment_mode !== false && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold text-slate-800">UPI / Online Direct</span>
                </div>
              )}
              {pdf.show_reverse_charge !== false && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Reverse Charge:</span>
                  <span className="font-semibold text-slate-800">NO</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Items Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-2 border-b border-slate-900 w-8 text-center">#</th>
                  <th className="p-2 border-b border-slate-900">Item & Service Details</th>
                  {pdf.show_hsn_column !== false && (
                    <th className="p-2 border-b border-slate-900 text-center">HSN/SAC</th>
                  )}
                  {pdf.show_qty_column !== false && (
                    <th className="p-2 border-b border-slate-900 text-center">Qty</th>
                  )}
                  {pdf.show_rate_column !== false && (
                    <th className="p-2 border-b border-slate-900 text-right">Rate (₹)</th>
                  )}
                  {pdf.show_taxable_column !== false && (
                    <th className="p-2 border-b border-slate-900 text-right">Taxable (₹)</th>
                  )}
                  {pdf.show_tax_column !== false && (
                    <th className="p-2 border-b border-slate-900 text-right">GST Tax (₹)</th>
                  )}
                  <th className="p-2 border-b border-slate-900 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={`item-${idx}`} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-2 space-y-1">
                      <div className="font-bold text-slate-900 text-[10.5px] flex items-center flex-wrap gap-1.5">
                        <span>{item.name}</span>
                        {pdf.show_item_brand !== false && item.brand && !item.isService && (
                          <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[8px] uppercase border border-slate-200">
                            {item.brand}
                          </span>
                        )}
                        {item.isService && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-extrabold text-[8px] uppercase border border-indigo-200">
                            [{item.serviceCategory || "SERVICE"}]
                          </span>
                        )}
                      </div>

                      {/* Specs Lines for Products */}
                      {!item.isService && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
                          {pdf.show_item_model !== false && item.model && (
                            <span>Model: {item.model}</span>
                          )}
                          {pdf.show_item_serial !== false && item.serial && (
                            <span className="font-mono text-slate-700">S/N: {item.serial}</span>
                          )}
                        </div>
                      )}

                      {/* Warranty & Service Plan Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {item.isService && item.serviceWarranty && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5px] font-semibold">
                            <Wrench className="w-2.5 h-2.5 text-emerald-600" />
                            Service Warranty: {item.serviceWarranty}
                          </span>
                        )}
                        {pdf.show_item_warranty !== false && !item.isService && item.warranty && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5px] font-semibold">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            {item.warranty}
                          </span>
                        )}
                        {pdf.show_item_service_plan !== false && item.servicePlan && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[8.5px] font-semibold">
                            <Wrench className="w-2.5 h-2.5 text-blue-600" />
                            {item.servicePlan}
                          </span>
                        )}
                      </div>

                      {pdf.show_item_notes !== false && item.notes && (
                        <div className="text-[8.5px] italic text-slate-500">
                          Note: {item.notes}
                        </div>
                      )}
                    </td>

                    {pdf.show_hsn_column !== false && (
                      <td className="p-2 text-center font-mono text-slate-600">{item.hsn}</td>
                    )}
                    {pdf.show_qty_column !== false && (
                      <td className="p-2 text-center font-semibold text-slate-800">{item.qty}</td>
                    )}
                    {pdf.show_rate_column !== false && (
                      <td className="p-2 text-right font-mono">{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    )}
                    {pdf.show_taxable_column !== false && (
                      <td className="p-2 text-right font-mono">{item.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    )}
                    {pdf.show_tax_column !== false && (
                      <td className="p-2 text-right font-mono">
                        {item.gstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <div className="text-[8px] text-slate-400">({item.gstRate}%)</div>
                      </td>
                    )}
                    <td className="p-2 text-right font-bold text-slate-900 font-mono">
                      {item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Bottom Grid (Bank Details / Notes Left, Totals Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Left Column: Bank Details, UPI QR, Invoice Notes */}
            <div className="space-y-3">
              {/* Bank Card */}
              {pdf.show_bank_details !== false && (
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/60 space-y-1">
                  <div className="text-[9px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                    <CreditCard className="w-3 h-3 text-slate-500" />
                    Bank Account Details
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[9.5px]">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-semibold text-slate-800">{bank.bank_name || "State Bank of India"}</span>
                    <span className="text-slate-500">A/C Holder:</span>
                    <span className="font-semibold text-slate-800">{bank.account_holder_name || shopName}</span>
                    <span className="text-slate-500">A/C Number:</span>
                    <span className="font-mono font-bold text-slate-900">{bank.account_number || "39820192841"}</span>
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono font-bold text-slate-900">{bank.ifsc_code || "SBIN0001234"}</span>
                  </div>
                </div>
              )}

              {/* UPI QR Box */}
              {pdf.show_upi_qr !== false && (
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/60 flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border border-slate-300 rounded p-1 flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                  <div className="text-[9.5px] space-y-0.5">
                    <div className="font-bold text-slate-900">Scan to Pay via UPI</div>
                    <div className="text-slate-500">UPI ID: <span className="font-mono font-semibold text-blue-600">{bank.upi_id || "apexelectronics@upi"}</span></div>
                    <div className="text-[8.5px] text-slate-400">Accepts BHIM, GPay, PhonePe, Paytm</div>
                  </div>
                </div>
              )}

              {/* Invoice Notes */}
              {pdf.show_notes !== false && (
                <div className="p-2.5 rounded border border-slate-200 bg-amber-50/40 text-[9.5px] space-y-0.5">
                  <div className="font-bold text-slate-800">Invoice Notes:</div>
                  <div className="text-slate-600 italic">
                    Thank you for your business! Please retain this tax invoice for warranty registration and service claims.
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Totals Summary Card */}
            <div className="p-3 rounded border border-slate-300 bg-slate-50/80 space-y-1.5 self-start">
              {pdf.show_subtotal !== false && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Items & Services Subtotal:</span>
                  <span className="font-mono">₹23,800.00</span>
                </div>
              )}
              {pdf.show_discount !== false && (
                <div className="flex justify-between text-[10px] text-emerald-700 font-medium">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-₹1,000.00</span>
                </div>
              )}
              {pdf.show_exchange_price !== false && (
                <div className="flex justify-between text-[10px] text-indigo-700 font-medium">
                  <span>Old Item Exchange Deduction:</span>
                  <span className="font-mono">-₹2,000.00</span>
                </div>
              )}
              {pdf.show_tax_breakdown !== false && (
                <div className="space-y-0.5 pt-1 border-t border-slate-200 text-[9.5px] text-slate-500">
                  <div className="flex justify-between">
                    <span>CGST @ 9%:</span>
                    <span className="font-mono">₹2,142.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST @ 9%:</span>
                    <span className="font-mono">₹2,142.00</span>
                  </div>
                </div>
              )}

              {/* Total Grand Amount */}
              <div className="flex justify-between items-center text-xs font-black text-slate-900 pt-1.5 border-t-2 border-slate-900">
                <span className="uppercase tracking-wider">Grand Total:</span>
                <span className="text-sm font-mono text-blue-700">₹28,084.00</span>
              </div>

              {pdf.show_amount_paid !== false && (
                <div className="flex justify-between text-[10px] text-emerald-800 font-semibold pt-0.5">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹28,084.00</span>
                </div>
              )}
              {pdf.show_balance_due !== false && (
                <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                  <span>Balance Due:</span>
                  <span className="font-mono font-bold text-slate-900">₹0.00</span>
                </div>
              )}

              {pdf.show_amount_in_words !== false && (
                <div className="pt-1.5 border-t border-slate-200 text-[8.5px] text-slate-500">
                  <span className="font-semibold text-slate-700">In Words:</span>{" "}
                  <span className="italic">Twenty-Eight Thousand Eighty-Four Rupees Only</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. Terms & Conditions Section */}
          {pdf.show_terms !== false && (
            <div className="mb-6 p-3 rounded border border-slate-200 bg-slate-50/40">
              <div className="text-[9px] font-extrabold uppercase text-slate-700 tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                Terms & Conditions
              </div>
              {Array.isArray(pdf.terms_and_conditions) && pdf.terms_and_conditions.length > 0 ? (
                <ol className="list-decimal list-inside space-y-0.5 text-[9px] text-slate-600">
                  {pdf.terms_and_conditions.map((term, index) => (
                    <li key={`preview-term-${index}`} className="leading-snug">
                      {term}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-[9px] text-slate-400 italic">No terms specified</div>
              )}
            </div>
          )}

          {/* 6. Signature & Footer Line */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-end gap-4">
            <div className="text-[8.5px] text-slate-500 space-y-0.5">
              {pdf.show_footer_note !== false && footerNote && (
                <div className="italic text-slate-600">{footerNote}</div>
              )}
              <div>E. & O.E. · Printed on {new Date().toLocaleDateString("en-IN")}</div>
            </div>

            {pdf.show_signature !== false && (
              <div className="text-right space-y-6">
                <div className="text-[9px] font-bold text-slate-700 uppercase">
                  For {shopName}
                </div>
                <div className="border-t border-slate-400 pt-1 text-[8.5px] text-slate-500 font-semibold inline-block min-w-[120px] text-center">
                  Authorized Signatory
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoicePdfPreview;
