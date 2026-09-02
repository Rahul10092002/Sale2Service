import { useDispatch, useSelector } from "react-redux";
import {
  selectCurrentInvoice,
  selectInvoiceErrors,
  selectIsSubmitting,
  selectExpandedSections,
  updateCustomer,
  updateCustomerAddress,
  updateInvoice,
  toggleCustomerOptional,
  toggleProductMetadata,
  addInvoiceItem,
  addServiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  recalculateInvoice,
  setErrors as setErrorsAction,
  setSubmitting as setSubmittingAction,
  resetForm,
  setInvoiceData,
} from "./invoiceSlice.js";
import {
  useCreateInvoiceMutation,
  useSearchCustomerMutation,
} from "./invoiceApi.js";
import { useCallback } from "react";

/** UI/backend fields when line item product_category is BATTERY */
export const INVOICE_ITEM_BATTERY_FIELDS = [
  "battery_type",
  "vehicle_name",
  "vehicle_number_plate",
];

export const useInvoiceForm = () => {
  const dispatch = useDispatch();
  const currentInvoice = useSelector(selectCurrentInvoice);
  const errors = useSelector(selectInvoiceErrors);
  const isSubmitting = useSelector(selectIsSubmitting);
  const expandedSections = useSelector(selectExpandedSections);

  // Actions
  const updateCustomerData = useCallback(
    (data) => {
      dispatch(updateCustomer(data));
    },
    [dispatch],
  );

  const updateCustomerAddressData = useCallback(
    (data) => {
      dispatch(updateCustomerAddress(data));
    },
    [dispatch],
  );

  const updateInvoiceData = useCallback(
    (fieldOrData, data) => {
      if (typeof fieldOrData === "object" && data === undefined) {
        dispatch(updateInvoice(fieldOrData));
        return;
      }

      const field = fieldOrData;
      if (field === "customer") {
        dispatch(updateCustomer(data));
      } else if (field === "invoice") {
        dispatch(updateInvoice(data));
      } else if (field === "invoice_items") {
        const currentData = { ...currentInvoice };
        currentData.invoice_items = data;
        dispatch(setInvoiceData(currentData));
      } else {
        dispatch(updateInvoice(data));
      }
    },
    [dispatch, currentInvoice],
  );

  const addItem = useCallback(() => {
    dispatch(addInvoiceItem());
    dispatch(recalculateInvoice());
  }, [dispatch]);

  const addService = useCallback(() => {
    dispatch(addServiceItem());
    dispatch(recalculateInvoice());
  }, [dispatch]);

  const toggleCustomerOptionalSection = useCallback(() => {
    dispatch(toggleCustomerOptional());
  }, [dispatch]);

  const toggleProductMetadataSection = useCallback(
    (id) => {
      dispatch(toggleProductMetadata(id));
    },
    [dispatch],
  );

  const updateItem = useCallback(
    (id, data) => {
      dispatch(updateInvoiceItem({ id, data }));
    },
    [dispatch],
  );

  const removeItem = useCallback(
    (id) => {
      dispatch(removeInvoiceItem(id));
      dispatch(recalculateInvoice());
    },
    [dispatch],
  );

  const setErrors = useCallback(
    (errors) => {
      dispatch(setErrorsAction(errors));
    },
    [dispatch],
  );

  const setSubmitting = useCallback(
    (submitting) => {
      dispatch(setSubmittingAction(submitting));
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    dispatch(resetForm());
  }, [dispatch]);

  const recalculate = useCallback(() => {
    dispatch(recalculateInvoice());
  }, [dispatch]);

  const setInvoiceDataCallback = useCallback(
    (data) => {
      dispatch(setInvoiceData(data));
    },
    [dispatch],
  );

  return {
    // State
    currentInvoice,
    errors,
    isSubmitting,
    expandedSections,

    // Actions
    updateCustomerData,
    updateCustomerAddressData,
    updateInvoiceData,
    addItem,
    addService,
    updateItem,
    removeItem,
    toggleCustomerOptional: toggleCustomerOptionalSection,
    toggleProductMetadata: toggleProductMetadataSection,
    setErrors,
    setSubmitting,
    recalculateInvoice: recalculate,
    reset,
    setInvoiceData: setInvoiceDataCallback,
  };
};

export const useInvoiceActions = () => {
  const [createInvoice] = useCreateInvoiceMutation();
  const [searchCustomer] = useSearchCustomerMutation();

  return {
    createInvoice,
    searchCustomer,
  };
};
