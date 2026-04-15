import { createSlice } from "@reduxjs/toolkit";
import { calculateInvoiceTotals as calculateSharedInvoiceTotals } from "../../../../shared/invoiceMath.js";

const initialState = {
  // Current invoice being created/edited
  currentInvoice: {
    customer: {
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
      tax: 0,
      total_amount: 0,
      amount_paid: 0,
      amount_due: 0,
      due_date: "",
    },
    invoice_items: [],
  },
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

    // ✅ Correct GST calculation for inclusive tax

  state.currentInvoice.invoice.discount = totals.discount;
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
      state.currentInvoice.customer = {
        ...state.currentInvoice.customer,
        ...action.payload,
      };
      // Clear related errors
      Object.keys(action.payload).forEach((key) => {
        delete state.errors[`customer.${key}`];
      });
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
    },

    setInvoiceNumber: (state, action) => {
      state.currentInvoice.invoice.invoice_number = action.payload;
    },

    // Invoice items
    addInvoiceItem: (state, action) => {
      const newItem = {
        id: Date.now() + Math.random(),
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

      // Auto-recalculate totals after adding item
      calculateInvoiceTotals(state);
    },

    updateInvoiceItem: (state, action) => {
      const { id, data } = action.payload;
      const item = state.currentInvoice.invoice_items.find((i) => i.id === id);
      if (item) {
        // Mutate existing item directly to preserve array and object identity
        Object.assign(item, data);

        // Auto-calculate margin if cost_price and selling_price are available
        if (item.cost_price && item.selling_price) {
          item.margin = (
            ((item.selling_price - item.cost_price) / item.cost_price) *
            100
          ).toFixed(2);
        }

        // Auto-calculate warranty end date
        if (item.warranty_start_date && item.warranty_duration_months) {
          const startDate = new Date(item.warranty_start_date);
          const endDate = new Date(startDate);
          endDate.setMonth(
            startDate.getMonth() + parseInt(item.warranty_duration_months),
          );
          item.warranty_end_date = endDate.toISOString().split("T")[0];
        }
      }

      // Clear item-specific errors
      Object.keys(data).forEach((key) => {
        delete state.errors[`item.${id}.${key}`];
      });
    },

    removeInvoiceItem: (state, action) => {
      const itemId = action.payload;
      state.currentInvoice.invoice_items =
        state.currentInvoice.invoice_items.filter((item) => item.id !== itemId);

      // Clear item-specific errors
      Object.keys(state.errors).forEach((key) => {
        if (key.startsWith(`item.${itemId}.`)) {
          delete state.errors[key];
        }
      });

      delete state.expandedSections.productMetadata[itemId];

      // Auto-recalculate totals after removing item
      calculateInvoiceTotals(state);
    },

    // Calculations
    recalculateInvoice: (state) => {
      calculateInvoiceTotals(state);
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
      state.currentInvoice = initialState.currentInvoice;
      state.errors = {};
      state.expandedSections = {
        customerOptional: false,
        productMetadata: {},
      };
    },

    // Set complete invoice data (for editing)
    setInvoiceData: (state, action) => {
      state.currentInvoice = {
        ...state.currentInvoice,
        ...action.payload,
      };
      // Recalculate totals after setting data
      calculateInvoiceTotals(state);
    },

    // Load existing customer data
    loadCustomerData: (state, action) => {
      state.currentInvoice.customer = {
        ...state.currentInvoice.customer,
        ...action.payload,
      };
    },
  },
});

export const {
  updateCustomer,
  updateCustomerAddress,
  updateInvoice,
  setInvoiceNumber,
  addInvoiceItem,
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

// Selectors
export const selectCurrentInvoice = (state) => state.invoice.currentInvoice;
export const selectInvoiceErrors = (state) => state.invoice.errors;
export const selectIsSubmitting = (state) => state.invoice.isSubmitting;
export const selectExpandedSections = (state) => state.invoice.expandedSections;

export default invoiceSlice.reducer;
