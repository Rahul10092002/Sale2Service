import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Edit,
  Package,
  ImagePlus,
  Camera,
  Trash2,
  Info,
} from "lucide-react";
import {
  Dialog as Modal,
  DialogHeader,
  DialogBody,
} from "../../components/ui/Modal.jsx";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import {
  useSaveMasterProductMutation,
  useUpdateInventoryProductMutation,
} from "../../features/products/productApi.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { getToken } from "../../utils/token.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

const CATEGORY_OPTIONS = [
  { value: "BATTERY", label: "Battery" },
  { value: "INVERTER", label: "Inverter" },
  { value: "UPS", label: "UPS" },
  { value: "SOLAR_PANEL", label: "Solar Panel" },
  { value: "CHARGER", label: "Charger" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

const WARRANTY_TYPES = [
  { value: "STANDARD", label: "Standard" },
  { value: "PRO", label: "Pro" },
  { value: "EXTENDED", label: "Extended" },
  { value: "LIMITED", label: "Limited" },
  { value: "NONE", label: "None" },
];

const BATTERY_TYPES = [
  { value: "INVERTER_BATTERY", label: "Inverter battery" },
  { value: "VEHICLE_BATTERY", label: "Vehicle battery" },
];

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


const MasterProductModal = ({ open, onClose, product }) => {
  const [saveMaster, { isLoading: isCreating }] = useSaveMasterProductMutation();
  const [updateMaster, { isLoading: isUpdating }] = useUpdateInventoryProductMutation();

  const [form, setForm] = useState({
    product_name: "",
    product_category: "BATTERY",
    battery_type: "",
    company: "",
    model_number: "",
    selling_price: "",
    cost_price: "",
    capacity_rating: "",
    voltage: "",
    warranty_type: "STANDARD",
    warranty_duration_months: "12",
    stock_quantity: "0",
    min_stock_alert: "5",
    product_images: [],
  });

  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setForm({
        product_name: product.product_name || "",
        product_category: product.product_category || "BATTERY",
        battery_type: product.battery_type || "",
        company: product.company || "",
        model_number: product.model_number || "",
        selling_price: product.selling_price || "",
        cost_price: product.cost_price || "",
        capacity_rating: product.capacity_rating || "",
        voltage: product.voltage || "",
        warranty_type: product.warranty_type || "STANDARD",
        warranty_duration_months: product.warranty_duration_months || "12",
        stock_quantity: product.stock_quantity || "0",
        min_stock_alert: product.min_stock_alert || "5",
        product_images: product.product_images || [],
      });
    } else {
        setForm({
            product_name: "",
            product_category: "BATTERY",
            battery_type: "",
            company: "",
            model_number: "",
            selling_price: "",
            cost_price: "",
            capacity_rating: "",
            voltage: "",
            warranty_type: "STANDARD",
            warranty_duration_months: "12",
            stock_quantity: "0",
            min_stock_alert: "5",
            product_images: [],
        });
    }
  }, [product, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (url) => {
    setForm((prev) => ({
      ...prev,
      product_images: prev.product_images.filter((u) => u !== url),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {
        ...form,
        selling_price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        warranty_duration_months: parseInt(form.warranty_duration_months) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock_alert: parseInt(form.min_stock_alert) || 0,
        auto_saved: false, // Manually created/modified
    };

    try {
      if (product?._id) {
        await updateMaster({ id: product._id, ...payload }).unwrap();
      } else {
        await saveMaster(payload).unwrap();
      }
      onClose();
    } catch (err) {
      setError(err.data?.message || "Something went wrong");
    }
  };

  const loading = isCreating || isUpdating;

  return (
    <Modal open={open} onClose={onClose} maxWidth="3xl">
      <DialogHeader
        title={product ? "Edit Catalog Product" : "Add New Product to Catalog"}
        onClose={onClose}
        icon={product ? <Edit className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
      />
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
              <Info className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                required
                placeholder="e.g. Exide IT500 Inverter Battery"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                name="product_category"
                value={form.product_category}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {CATEGORY_OPTIONS.filter(o => o.value).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {form.product_category === "BATTERY" && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Battery Type
                </label>
                <select
                  name="battery_type"
                  value={form.battery_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select Type</option>
                  {BATTERY_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company / Brand
              </label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="e.g. Exide"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Model Number
              </label>
              <input
                name="model_number"
                value={form.model_number}
                onChange={handleChange}
                placeholder="e.g. IT500"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t border-b border-gray-100 dark:border-dark-border py-4 my-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-red-500">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={form.cost_price}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl focus:ring-2 focus:ring-red-500 transition-all text-red-600 dark:text-red-400 font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Hidden from customers</p>
                </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-dark-border pb-4 mb-2">
                <div>
                   <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Current Stock Quantity
                   </label>
                   <input
                     type="number"
                     name="stock_quantity"
                     value={form.stock_quantity}
                     onChange={handleChange}
                     placeholder="0"
                     className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                   />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                     Low Stock Alert at
                  </label>
                  <input
                    type="number"
                    name="min_stock_alert"
                    value={form.min_stock_alert}
                    onChange={handleChange}
                    placeholder="5"
                    className="w-full px-4 py-2 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl focus:ring-2 focus:ring-amber-500 transition-all font-medium text-amber-700 dark:text-amber-400"
                  />
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Capacity / Rating
              </label>
              <input
                name="capacity_rating"
                value={form.capacity_rating}
                onChange={handleChange}
                placeholder="e.g. 150Ah"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Voltage
              </label>
              <input
                name="voltage"
                value={form.voltage}
                onChange={handleChange}
                placeholder="e.g. 12V"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Warranty Type
              </label>
              <select
                name="warranty_type"
                value={form.warranty_type}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {WARRANTY_TYPES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Duration (Months)
              </label>
              <input
                type="number"
                name="warranty_duration_months"
                value={form.warranty_duration_months}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Product Images Section */}
          <div className="space-y-3">
             <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Product Images
             </label>
             <div className="flex flex-wrap gap-3">
                {form.product_images?.map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
                
                <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all hover:border-indigo-400 group">
                    {imageUploading ? <LoadingSpinner size="xs" /> : (
                        <>
                           <ImagePlus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                           <span className="text-[10px] text-gray-400 font-medium mt-1">Files</span>
                        </>
                    )}
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                </label>

                <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:border-blue-400 group">
                   {imageUploading ? <LoadingSpinner size="xs" /> : (
                        <>
                           <Camera className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                           <span className="text-[10px] text-gray-400 font-medium mt-1">Camera</span>
                        </>
                    )}
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                </label>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700 font-bold">
              {loading ? <LoadingSpinner size="xs" /> : (product ? "Save Changes" : "Save Product")}
            </Button>
          </div>
        </form>
      </DialogBody>
    </Modal>
  );
};

export default MasterProductModal;
