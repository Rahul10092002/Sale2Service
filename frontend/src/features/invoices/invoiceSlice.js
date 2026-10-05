import { createSlice } from "@reduxjs/toolkit";
import { calculateInvoiceTotals as calculateSharedInvoiceTotals } from "../../../../shared/invoiceMath.js";

const DRAFT_KEY = "warranty_desk_invoice_draft";

const defaultCurrentInvoice = {
  customer: {
    first_name: "",
    last_name: "",
    full_name: "",
    whatsapp_number: "",
    alternate_phone: "",
    email: "",
    date_of_birth: "",
    anniversary_date: "",
    preferred_language: "ENGLISH",
    gst_number: "",
    customer_type: "RETAIL",
    notes: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    },
  },
  invoice: {
    invoice_date: new Date().toISOString().split("T")[0],
    payment_status: "UNPAID",
    payment_mode: "CASH",
    is_tax_inclusive: true,
    subtotal: 0,
    discount: 0,
    old_item_exchange_price: 0,
    tax: 0,
    total_amount: 0,
    amount_paid: 0,
    amount_due: 0,
    due_date: "",
  },
  invoice_items: [],
};

const loadSavedDraft = () => {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        parsed.customer &&
        parsed.invoice &&
        Array.isArray(parsed.invoice_items)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load invoice draft:", e);
  }
  return null;
};

const saveDraft = (currentInvoice) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(currentInvoice));
  } catch (e) {
    console.error("Failed to save invoice draft:", e);
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error("Failed to clear invoice draft:", e);
  }
};

const initialState = {
  // Current invoice being created/edited
  currentInvoice: loadSavedDraft() || defaultCurrentInvoice,
  // UI state
  isSubmitting: false,
  errors: {},
  expandedSections: {
    customerOptional: false,
    productMetadata: {},
  },
};

const calculateInvoiceTotals = (state) => {
  const totals = calculateSharedInvoiceTotals({
    invoice: state.currentInvoice.invoice,
    items: state.currentInvoice.invoice_items,
  });
  state.currentInvoice.invoice.subtotal = totals.subtotal;
  state.currentInvoice.invoice.discount = totals.discount;
  state.currentInvoice.invoice.old_item_exchange_price =
    totals.old_item_exchange_price;
  state.currentInvoice.invoice.tax = totals.tax;
  state.currentInvoice.invoice.total_amount = totals.total_amount;
  state.currentInvoice.invoice.amount_paid = totals.amount_paid;
  state.currentInvoice.invoice.amount_due = totals.amount_due;
  state.currentInvoice.invoice.payment_status = totals.payment_status;
  state.currentInvoice.invoice.is_tax_inclusive = totals.is_tax_inclusive;
};

const invoiceSlice = createSlice({
  name: "invoice",
  initialState,
  reducers: {
    // Customer data
    updateCustomer: (state, action) => {
      const updated = {
        ...state.currentInvoice.customer,
        ...action.payload,
      };

      // Auto-sync first_name, last_name, and full_name
      if ("first_name" in action.payload || "last_name" in action.payload) {
        const fn = updated.first_name || "";
        const ln = updated.last_name || "";
        updated.full_name = [fn, ln].filter(Boolean).join(" ");
      } else if ("full_name" in action.payload && action.payload.full_name) {
        const parts = action.payload.full_name.trim().split(/\s+/);
        if (!("first_name" in action.payload)) {
          updated.first_name = parts[0] || "";
        }
        if (!("last_name" in action.payload)) {
          updated.last_name = parts.slice(1).join(" ") || "";
        }
      }

      state.currentInvoice.customer = updated;
      // Clear related errors
      Object.keys(action.payload).forEach((key) => {
        delete state.errors[`customer.${key}`];
      });
      delete state.errors["customer.first_name"];
      delete state.errors["customer.full_name"];
      saveDraft(state.currentInvoice);
    },

    updateCustomerAddress: (state, action) => {
      state.currentInvoice.customer.address = {
        ...state.currentInvoice.customer.address,
        ...action.payload,
      };
      // Clear related errors
      Object.keys(action.payload).forEach((key) => {
        delete state.errors[`customer.address.${key}`];
      });
      saveDraft(state.currentInvoice);
    },

    // Invoice data
    updateInvoice: (state, action) => {
      state.currentInvoice.invoice = {
        ...state.currentInvoice.invoice,
        ...action.payload,
      };
      // Clear related errors
      Object.keys(action.payload).forEach((key) => {
        delete state.errors[`invoice.${key}`];
      });

      // Auto-recalculate totals after updating invoice data
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    setInvoiceNumber: (state, action) => {
      state.currentInvoice.invoice.invoice_number = action.payload;
      saveDraft(state.currentInvoice);
    },

    // Invoice items
    addInvoiceItem: (state, action) => {
      const newItem = {
        id: Date.now() + Math.random(),
        item_type: "PRODUCT",
        serial_number: "",
        product_name: "",
        product_category: "BATTERY",
        battery_type: "",
        vehicle_name: "",
        vehicle_number_plate: "",
        company: "",
        model_number: "",
        selling_price: 0,
        quantity: 1,
        warranty_type: "STANDARD",
        warranty_start_date: new Date().toISOString().split("T")[0],
        warranty_duration_months: 12,
        warranty_end_date: "",
        pro_warranty_end_date: "",
        manufacturing_date: "",
        capacity_rating: "",
        voltage: "",
        batch_number: "",
        purchase_source: "",
        cost_price: 0,
        margin: 0,
        status: "ACTIVE",
        ...action.payload,
      };
      state.currentInvoice.invoice_items.push(newItem);
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    addServiceItem: (state, action) => {
      const newItem = {
        id: Date.now() + Math.random(),
        item_type: "SERVICE",
        service_category: "REPAIR",
        serial_number: "",
        product_name: "",
        product_category: "OTHER",
        selling_price: 0,
        quantity: 1,
        warranty_type: "STANDARD",
        warranty_duration_months: 0,
        warranty_start_date: new Date().toISOString().split("T")[0],
        warranty_end_date: "",
        notes: "",
        cost_price: 0,
        margin: 0,
        status: "ACTIVE",
        ...action.payload,
      };
      state.currentInvoice.invoice_items.push(newItem);
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    updateInvoiceItem: (state, action) => {
      const { id, data } = action.payload;
      const item = state.currentInvoice.invoice_items.find((i) => i.id === id);
      if (item) {
        Object.assign(item, data);

        if (item.cost_price && item.selling_price) {
          item.margin = (
            ((item.selling_price - item.cost_price) / item.cost_price) *
            100
          ).toFixed(2);
        }

        if (item.warranty_start_date && item.warranty_duration_months) {
          const startDate = new Date(item.warranty_start_date);
          const endDate = new Date(startDate);
          endDate.setMonth(
            startDate.getMonth() + parseInt(item.warranty_duration_months),
          );
          item.warranty_end_date = endDate.toISOString().split("T")[0];
        }
      }

      Object.keys(data).forEach((key) => {
        delete state.errors[`item.${id}.${key}`];
      });
      saveDraft(state.currentInvoice);
    },

    removeInvoiceItem: (state, action) => {
      const itemId = action.payload;
      state.currentInvoice.invoice_items =
        state.currentInvoice.invoice_items.filter((item) => item.id !== itemId);

      Object.keys(state.errors).forEach((key) => {
        if (key.startsWith(`item.${itemId}.`)) {
          delete state.errors[key];
        }
      });

      delete state.expandedSections.productMetadata[itemId];
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    // Calculations
    recalculateInvoice: (state) => {
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    // UI state
    toggleCustomerOptional: (state) => {
      state.expandedSections.customerOptional =
        !state.expandedSections.customerOptional;
    },

    toggleProductMetadata: (state, action) => {
      const itemId = action.payload;
      state.expandedSections.productMetadata[itemId] =
        !state.expandedSections.productMetadata[itemId];
    },

    // Form validation
    setErrors: (state, action) => {
      state.errors = action.payload;
    },

    clearErrors: (state) => {
      state.errors = {};
    },

    clearError: (state, action) => {
      delete state.errors[action.payload];
    },

    // Form actions
    setSubmitting: (state, action) => {
      state.isSubmitting = action.payload;
    },

    resetForm: (state) => {
      state.currentInvoice = defaultCurrentInvoice;
      state.errors = {};
      state.expandedSections = {
        customerOptional: false,
        productMetadata: {},
      };
      clearDraft();
    },

    setInvoiceData: (state, action) => {
      state.currentInvoice = {
        ...state.currentInvoice,
        ...action.payload,
      };
      calculateInvoiceTotals(state);
      saveDraft(state.currentInvoice);
    },

    loadCustomerData: (state, action) => {
      state.currentInvoice.customer = {
        ...state.currentInvoice.customer,
        ...action.payload,
      };
      saveDraft(state.currentInvoice);
    },
  },
});

export const {
  updateCustomer,
  updateCustomerAddress,
  updateInvoice,
  setInvoiceNumber,
  addInvoiceItem,
  addServiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  recalculateInvoice,
  toggleCustomerOptional,
  toggleProductMetadata,
  setErrors,
  clearErrors,
  clearError,
  setSubmitting,
  resetForm,
  setInvoiceData,
  loadCustomerData,
} = invoiceSlice.actions;

export const selectCurrentInvoice = (state) => state.invoice.currentInvoice;
export const selectInvoiceErrors = (state) => state.invoice.errors;
export const selectIsSubmitting = (state) => state.invoice.isSubmitting;
export const selectExpandedSections = (state) => state.invoice.expandedSections;

export default invoiceSlice.reducer;
