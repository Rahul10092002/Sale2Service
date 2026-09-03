import React, { useState, useRef } from "react";
import { X, Plus, Trash2, FileSpreadsheet, Building2, Package, ScanLine, Upload, Image as ImageIcon } from "lucide-react";
import { useGetDealersQuery } from "../../features/dealers/dealerApi.js";
import { useGetProductsQuery, useGetInventoryProductsQuery } from "../../features/products/productApi.js";
import { useCreateReceivingSlipMutation } from "../../features/inventory/inventoryApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import SerialScanner from "../../components/invoice/SerialScanner.jsx";
import { getToken } from "../../utils/token.js";

const ReceivingSlipModal = ({ isOpen, onClose, onOpenDealers }) => {
  const { data: dealersData } = useGetDealersQuery(undefined, { skip: !isOpen });
  const { data: productsData } = useGetProductsQuery({}, { skip: !isOpen });
  const { data: inventoryProductsData } = useGetInventoryProductsQuery({ limit: 100 }, { skip: !isOpen });
  const [createReceivingSlip, { isLoading: isSubmitting }] = useCreateReceivingSlipMutation();

  const dealers = dealersData?.dealers || [];
  
  // Merge ProductMaster items + InvoiceItem catalog items, deduplicating by _id / name
  const rawProductsList = [
    ...(inventoryProductsData?.products || []),
    ...(productsData?.products || []),
  ];
  const seenIds = new Set();
  const products = rawProductsList.filter((p) => {
    if (seenIds.has(p._id)) return false;
    seenIds.add(p._id);
    return true;
  });

  const [dealerId, setDealerId] = useState("");
  const [dealerInvoiceNo, setDealerInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [purchaseBillImage, setPurchaseBillImage] = useState("");
  const [isUploadingBill, setIsUploadingBill] = useState(false);

  // Scanner state: stores index of active row being scanned, or null
  const [activeScannerRowIndex, setActiveScannerRowIndex] = useState(null);

  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([
    { product_id: "", purchase_price: "", raw_serials: "" },
  ]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { product_id: "", purchase_price: "", raw_serials: "" }]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "product_id") {
      const selectedProd = products.find((p) => p._id === value);
      if (selectedProd && selectedProd.cost_price) {
        updated[index].purchase_price = selectedProd.cost_price;
      }
    }

    setRows(updated);
  };

  const handleScanSuccess = (scannedCode) => {
    if (activeScannerRowIndex !== null && activeScannerRowIndex < rows.length) {
      const updated = [...rows];
      const currentVal = updated[activeScannerRowIndex].raw_serials.trim();
      if (currentVal) {
        updated[activeScannerRowIndex].raw_serials = `${currentVal}, ${scannedCode}`;
      } else {
        updated[activeScannerRowIndex].raw_serials = scannedCode;
      }
      setRows(updated);
    }
    setActiveScannerRowIndex(null);
  };

  const handleBillImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBill(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("product_images", file);

      const API_BASE_URL =
        import.meta.env.VITE_ENVIRONMENT === "production"
          ? import.meta.env.VITE_PROD_API_URL
          : import.meta.env.VITE_LOCAL_API_URL;

      const response = await fetch(`${API_BASE_URL}/files/product-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const resData = await response.json();
      if (response.ok && resData.success && resData.data?.[0]?.image_url) {
        setPurchaseBillImage(resData.data[0].image_url);
      } else {
        throw new Error(resData.message || "Failed to upload purchase bill photo.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Image upload failed.");
    } finally {
      setIsUploadingBill(false);
    }
  };

  const parseSerials = (rawText) => {
    if (!rawText) return [];
    return rawText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const calculateTotals = () => {
    let totalItems = 0;
    let totalCost = 0;

    rows.forEach((r) => {
      const serials = parseSerials(r.raw_serials);
      const count = serials.length > 0 ? serials.length : 1;
      totalItems += count;
      totalCost += (Number(r.purchase_price) || 0) * count;
    });

    return { totalItems, totalCost };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!dealerId) {
      setErrorMsg("Please select a Dealer.");
      return;
    }

    const formattedItems = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.product_id) {
        setErrorMsg(`Row #${i + 1}: Please select a Product.`);
        return;
      }
      const serials = parseSerials(r.raw_serials);
      formattedItems.push({
        product_id: r.product_id,
        purchase_price: Number(r.purchase_price) || 0,
        serial_numbers: serials,
      });
    }

    try {
      const res = await createReceivingSlip({
        dealer_id: dealerId,
        dealer_invoice_no: dealerInvoiceNo,
        purchase_date: purchaseDate,
        purchase_bill_image: purchaseBillImage,
        notes,
        items: formattedItems,
      }).unwrap();

      setSuccessMsg(res.message || "Receiving Slip intake created successfully!");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setPurchaseBillImage("");
        setRows([{ product_id: "", purchase_price: "", raw_serials: "" }]);
      }, 1500);
    } catch (err) {
      setErrorMsg(err?.data?.message || "Failed to process stock intake.");
    }
  };

  const totals = calculateTotals();

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Receiving Slip & Purchase Intake
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Log supplier shipments, upload purchase bill, & scan serial numbers
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
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-lg border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-lg border border-green-200 dark:border-green-800">
                {successMsg}
              </div>
            )}

            {/* Supplier & Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Dealer / Supplier *
                  </label>
                  <button
                    type="button"
                    onClick={onOpenDealers}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Dealer
                  </button>
                </div>
                <select
                  required
                  value={dealerId}
                  onChange={(e) => setDealerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">-- Select Supplier --</option>
                  {dealers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dealer Bill / Invoice #
                </label>
                <input
                  type="text"
                  value={dealerInvoiceNo}
                  onChange={(e) => setDealerInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-DEALER-9921"
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Purchase Bill Image Upload Option */}
            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" /> Purchase Bill / Invoice Attachment
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleBillImageUpload}
                className="hidden"
              />

              {purchaseBillImage ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 group">
                    <img
                      src={purchaseBillImage}
                      alt="Purchase Bill"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPurchaseBillImage("")}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-80 hover:opacity-100"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      ✓ Bill Photo Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-600 hover:underline block mt-1"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={isUploadingBill}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs border-dashed border-gray-300 dark:border-gray-600"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" /> Upload Purchase Bill Photo
                  </Button>
                  <span className="text-xs text-gray-400">
                    Upload physical invoice image/photo for audit records
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic Receiving Items Table with Camera Serial Scanner */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Received Items List
                </h3>
                <span className="text-xs text-gray-500">
                  Scan barcode with camera or paste comma-separated serials
                </span>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200">
                  <thead className="bg-gray-100 dark:bg-gray-900/80 uppercase font-semibold text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Product Catalog Item *</th>
                      <th className="p-3 w-32">Cost Price (₹)</th>
                      <th className="p-3">Serial Numbers (Scan Barcode / Type)</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {rows.map((row, idx) => {
                      const parsedCount = parseSerials(row.raw_serials).length;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="p-3 text-center font-medium text-gray-500">{idx + 1}</td>
                          <td className="p-3">
                            <select
                              required
                              value={row.product_id}
                              onChange={(e) => handleRowChange(idx, "product_id", e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              <option value="">-- Select Product --</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.product_name} ({p.company || "Generic"})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.purchase_price}
                              onChange={(e) => handleRowChange(idx, "purchase_price", e.target.value)}
                              placeholder="Cost"
                              className="w-full px-2 py-1.5 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex gap-2 items-center">
                                <textarea
                                  rows={2}
                                  value={row.raw_serials}
                                  onChange={(e) => handleRowChange(idx, "raw_serials", e.target.value)}
                                  placeholder="e.g. SN-1001, SN-1002"
                                  className="flex-1 px-2.5 py-1.5 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono uppercase"
                                />
                                <button
                                  type="button"
                                  onClick={() => setActiveScannerRowIndex(idx)}
                                  className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/60 flex items-center gap-1.5 shrink-0 border border-indigo-200 dark:border-indigo-800"
                                  title="Scan Barcode with Camera"
                                >
                                  <ScanLine className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Scan
                                </button>
                              </div>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold">
                                Count: {parsedCount || 1}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={rows.length === 1}
                              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Item Row
                  </Button>

                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-4">
                    <span>Total Units: <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{totals.totalItems}</strong></span>
                    <span>Estimated Total Cost: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">₹{totals.totalCost.toLocaleString("en-IN")}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Receiving Notes / Packing Slip Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received 1 box via Express Cargo shipment"
                className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6"
              >
                Submit Receiving Slip
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Serial Scanner Camera Modal */}
      {activeScannerRowIndex !== null && (
        <SerialScanner
          onScan={handleScanSuccess}
          onClose={() => setActiveScannerRowIndex(null)}
        />
      )}
    </>
  );
};

export default ReceivingSlipModal;
