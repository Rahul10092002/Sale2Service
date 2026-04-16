import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Edit, Package, ImagePlus, Camera, X } from "lucide-react";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import {
  Dialog as Modal,
  DialogHeader,
  DialogBody,
} from "../../components/ui/Modal.jsx";
import { useUpdateProductMutation } from "../../features/products/productApi.js";
import { showToast } from "../../features/ui/uiSlice.js";
import { getToken } from "../../utils/token.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const MAX_PX = 900;
    const QUALITY = 0.78;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas compression failed"));
        },
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });

const CATEGORY_OPTIONS = [
  { value: "BATTERY", label: "Battery" },
  { value: "INVERTER", label: "Inverter" },
  { value: "UPS", label: "UPS" },
  { value: "SOLAR_PANEL", label: "Solar Panel" },
  { value: "CHARGER", label: "Charger" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

const WARRANTY_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "EXTENDED", label: "Extended" },
  { value: "PRO", label: "Pro" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "REPLACED", label: "Replaced" },
  { value: "RETURNED", label: "Returned" },
  { value: "UNDER_SERVICE", label: "Under Service" },
];
const BATTERY_TYPE_OPTIONS = [
  { value: "INVERTER_BATTERY", label: "Inverter battery" },
  { value: "VEHICLE_BATTERY", label: "Vehicle battery" },
];

const toDateInput = (val) =>
  val ? new Date(val).toISOString().split("T")[0] : "";

const EditProductModal = ({ open, onClose, product, productId }) => {
  const dispatch = useDispatch();
  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  const [form, setForm] = useState({
    product_name: "",
    company: "",
    model_number: "",
    serial_number: "",
    product_category: "",
    battery_type: "",
    vehicle_name: "",
    vehicle_number_plate: "",
    quantity: 1,
    selling_price: 0,
    cost_price: "",
    status: "ACTIVE",
    warranty_start_date: "",
    warranty_end_date: "",
    warranty_duration_months: 1,
    warranty_type: "STANDARD",
    pro_warranty_end_date: "",
    capacity_rating: "",
    voltage: "",
    batch_number: "",
    manufacturing_date: "",
    purchase_source: "",
    notes: "",
    product_images: [],
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

  useEffect(() => {
    if (product && open) {
      setForm({
        product_name: product.product_name || "",
        company: product.company || "",
        model_number: product.model_number || "",
        serial_number: product.serial_number || "",
        product_category: product.product_category || "",
        battery_type: product.battery_type || "",
        vehicle_name: product.vehicle_name || "",
        vehicle_number_plate: product.vehicle_number_plate || "",
        quantity: product.quantity ?? 1,
        selling_price: product.selling_price ?? 0,
        cost_price:
          product.cost_price != null ? String(product.cost_price) : "",
        status: product.status || "ACTIVE",
        warranty_start_date: toDateInput(product.warranty_start_date),
        warranty_end_date: toDateInput(product.warranty_end_date),
        warranty_duration_months: product.warranty_duration_months ?? 1,
        warranty_type: product.warranty_type || "STANDARD",
        pro_warranty_end_date: toDateInput(product.pro_warranty_end_date),
        capacity_rating: product.capacity_rating || "",
        voltage: product.voltage || "",
        batch_number: product.batch_number || "",
        manufacturing_date: toDateInput(product.manufacturing_date),
        purchase_source: product.purchase_source || "",
        notes: product.notes || "",
        product_images: product.product_images || [],
      });
    }
  }, [product, open]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError(null);
    setImageUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append("product_images", compressed, "product.jpg");
      }

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/files/product-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Upload failed");
      }

      const newUrls = json.data.images.map((img) => img.image_url);
      setForm((prev) => ({
        ...prev,
        product_images: [...(prev.product_images || []), ...newUrls],
      }));
    } catch (err) {
      console.error("Product image upload error:", err);
      setImageError(err.message || "Upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (urlToRemove) => {
    setForm((prev) => ({
      ...prev,
      product_images: prev.product_images.filter((url) => url !== urlToRemove),
    }));
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) {
      dispatch(
        showToast({ message: "Product name is required", type: "error" }),
      );
      return;
    }
    if (!form.serial_number.trim()) {
      dispatch(
        showToast({ message: "Serial number is required", type: "error" }),
      );
      return;
    }
    if (!form.product_category) {
      dispatch(showToast({ message: "Category is required", type: "error" }));
      return;
    }
    if (form.product_category === INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY) {
      if (!form.battery_type) {
        dispatch(
          showToast({ message: "Battery type is required", type: "error" }),
        );
        return;
      }
      if (form.battery_type === INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY) {
        if (!form.vehicle_name.trim()) {
          dispatch(
            showToast({ message: "Vehicle name is required", type: "error" }),
          );
          return;
        }
        if (!form.vehicle_number_plate.trim()) {
          dispatch(
            showToast({ message: "Number plate is required", type: "error" }),
          );
          return;
        }
      }
    }

    const payload = {
      id: productId,
      product_name: form.product_name.trim(),
      company: form.company.trim(),
      model_number: form.model_number.trim(),
      serial_number: form.serial_number.trim(),
      product_category: form.product_category,
      quantity: Number(form.quantity),
      selling_price: parseFloat(form.selling_price) || 0,
      status: form.status,
      warranty_start_date: form.warranty_start_date || undefined,
      warranty_end_date: form.warranty_end_date || undefined,
      warranty_duration_months: Number(form.warranty_duration_months),
      warranty_type: form.warranty_type,
      notes: form.notes.trim(),
      product_images: form.product_images,
    };
    if (form.product_category === INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY) {
      payload.battery_type = form.battery_type;
      if (form.battery_type === INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY) {
        payload.vehicle_name = form.vehicle_name.trim();
        payload.vehicle_number_plate = form.vehicle_number_plate.trim().toUpperCase();
      }
    }

    if (form.cost_price !== "")
      payload.cost_price = parseFloat(form.cost_price);
    if (form.pro_warranty_end_date)
      payload.pro_warranty_end_date = form.pro_warranty_end_date;
    if (form.capacity_rating.trim())
      payload.capacity_rating = form.capacity_rating.trim();
    if (form.voltage.trim()) payload.voltage = form.voltage.trim();
    if (form.batch_number.trim())
      payload.batch_number = form.batch_number.trim();
    if (form.manufacturing_date)
      payload.manufacturing_date = form.manufacturing_date;
    if (form.purchase_source.trim())
      payload.purchase_source = form.purchase_source.trim();

    try {
      await updateProduct(payload).unwrap();
      dispatch(
        showToast({
          message: "Product updated successfully!",
          type: "success",
        }),
      );
      onClose();
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Failed to update product",
          type: "error",
        }),
      );
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <Modal open={open} onClose={onClose} maxWidth="3xl">
      <DialogHeader
        title={
          <div className="flex items-center space-x-2">
            <Edit className="text-indigo-600" size={20} />
            <span>Edit Product Details</span>
          </div>
        }
        onClose={onClose}
      />
      <DialogBody>
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Product Name *</label>
                <input
                  type="text"
                  value={form.product_name}
                  onChange={set("product_name")}
                  className={inputCls}
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className={labelCls}>Category *</label>
                <select
                  value={form.product_category}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      product_category: nextCategory,
                      ...(nextCategory !== INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY
                        ? {
                            battery_type: "",
                            vehicle_name: "",
                            vehicle_number_plate: "",
                          }
                        : {}),
                    }));
                  }}
                  className={inputCls}
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.product_category === INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY && (
                <>
                  <div>
                    <label className={labelCls}>Battery Type *</label>
                    <select
                      value={form.battery_type}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          battery_type: nextType,
                          ...(nextType !== INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY
                            ? { vehicle_name: "", vehicle_number_plate: "" }
                            : {}),
                        }));
                      }}
                      className={inputCls}
                    >
                      <option value="">Select battery type</option>
                      {BATTERY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.battery_type ===
                    INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY && (
                    <>
                      <div>
                        <label className={labelCls}>Vehicle Name *</label>
                        <input
                          type="text"
                          value={form.vehicle_name}
                          onChange={set("vehicle_name")}
                          className={inputCls}
                          placeholder="e.g. Maruti Swift"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Number Plate *</label>
                        <input
                          type="text"
                          value={form.vehicle_number_plate}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              vehicle_number_plate: e.target.value.toUpperCase(),
                            }))
                          }
                          className={inputCls}
                          placeholder="e.g. MH12AB1234"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              <div>
                <label className={labelCls}>Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={set("company")}
                  className={inputCls}
                  placeholder="Company / Brand"
                />
              </div>
              <div>
                <label className={labelCls}>Model Number</label>
                <input
                  type="text"
                  value={form.model_number}
                  onChange={set("model_number")}
                  className={inputCls}
                  placeholder="Model number"
                />
              </div>
              <div>
                <label className={labelCls}>Serial Number *</label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={set("serial_number")}
                  className={inputCls}
                  placeholder="Serial number"
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={form.status}
                  onChange={set("status")}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantity</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={set("quantity")}
                  className={inputCls}
                  min="1"
                />
              </div>
              <div>
                <label className={labelCls}>Capacity / Rating</label>
                <input
                  type="text"
                  value={form.capacity_rating}
                  onChange={set("capacity_rating")}
                  className={inputCls}
                  placeholder="e.g. 150Ah, 1kVA"
                />
              </div>
              <div>
                <label className={labelCls}>Voltage</label>
                <input
                  type="text"
                  value={form.voltage}
                  onChange={set("voltage")}
                  className={inputCls}
                  placeholder="e.g. 12V"
                />
              </div>
              <div>
                <label className={labelCls}>Batch Number</label>
                <input
                  type="text"
                  value={form.batch_number}
                  onChange={set("batch_number")}
                  className={inputCls}
                  placeholder="Batch number"
                />
              </div>
              <div>
                <label className={labelCls}>Manufacturing Date</label>
                <input
                  type="date"
                  value={form.manufacturing_date}
                  onChange={set("manufacturing_date")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Purchase Source</label>
                <input
                  type="text"
                  value={form.purchase_source}
                  onChange={set("purchase_source")}
                  className={inputCls}
                  placeholder="Supplier / distributor"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Pricing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Selling Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={form.selling_price}
                    onChange={set("selling_price")}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Cost Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={form.cost_price}
                    onChange={set("cost_price")}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                    step="1"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Warranty
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Warranty Type</label>
                <select
                  value={form.warranty_type}
                  onChange={set("warranty_type")}
                  className={inputCls}
                >
                  {WARRANTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Warranty Duration (months)</label>
                <input
                  type="number"
                  value={form.warranty_duration_months}
                  onChange={set("warranty_duration_months")}
                  className={inputCls}
                  min="1"
                  placeholder="12"
                />
              </div>
              <div>
                <label className={labelCls}>Warranty Start Date</label>
                <input
                  type="date"
                  value={form.warranty_start_date}
                  onChange={set("warranty_start_date")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Warranty End Date</label>
                <input
                  type="date"
                  value={form.warranty_end_date}
                  onChange={set("warranty_end_date")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pro Warranty End Date</label>
                <input
                  type="date"
                  value={form.pro_warranty_end_date}
                  onChange={set("pro_warranty_end_date")}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              className={inputCls}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          {/* Product Images */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-indigo-500" />
              Product Images
            </h4>
            <div className="flex flex-wrap gap-3">
              {form.product_images?.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                {imageUploading ? (
                  <LoadingSpinner size="xs" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>

              <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                {imageUploading ? (
                  <LoadingSpinner size="xs" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Camera</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            </div>
            {imageError && (
              <p className="text-xs text-red-500 mt-2">{imageError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <div className="flex items-center space-x-1">
                {isLoading ? <LoadingSpinner size="xs" /> : <Edit size={16} />}
                <span>Save Changes</span>
              </div>
            </Button>
          </div>
        </div>
      </DialogBody>
    </Modal>
  );
};

export default EditProductModal;
