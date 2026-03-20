import React, { useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Shield,
} from "lucide-react";
import { Button, Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";
import ProductCard from "./ProductCard";

const InvoiceItemsForm = () => {
  const {
    currentInvoice,
    expandedSections,
    addItem,
    updateItem,
    removeItem,
    toggleProductMetadata: toggleMetadata,
    errors,
    recalculateInvoice,
  } = useInvoiceForm();

  // Simple helpers: updateItem is safe for text inputs. Recalculate only when
  // numeric fields change (selling price, quantity, warranty duration, cost).
  const updateItemImmediate = useCallback(
    (id, data) => {
      updateItem(id, data);
    },
    [updateItem],
  );

  const addItemWithRecalc = useCallback(() => {
    addItem();
  }, [addItem]);

  const removeItemWithRecalc = useCallback(
    (id) => {
      removeItem(id);
    },
    [removeItem],
  );

  const { invoice_items } = currentInvoice;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Invoice Items
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add products with serial number tracking and warranty details
            </p>
          </div>
          <Button
            type="button"
            onClick={addItemWithRecalc}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        <div className="p-4 sm:p-6">
          {invoice_items.length === 0 ? (
            <div className="text-center py-8 sm:py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No Products Added
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 px-4">
                Start by adding your first product to the invoice
              </p>
              <Button
                type="button"
                onClick={addItemWithRecalc}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {invoice_items.map((item, index) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  index={index}
                  expandedSections={expandedSections}
                  updateItem={updateItem}
                  updateItemImmediate={updateItemImmediate}
                  removeItem={removeItemWithRecalc}
                  toggleProductMetadata={toggleMetadata}
                  errors={errors}
                  recalculateInvoice={recalculateInvoice}
                />
              ))}

              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItemWithRecalc}
                  className="w-full flex items-center justify-center gap-2 h-12"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Product
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceItemsForm;
