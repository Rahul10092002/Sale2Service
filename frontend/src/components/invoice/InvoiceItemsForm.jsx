import React, { useCallback } from "react";
import { Plus, Package, Wrench } from "lucide-react";
import { Button } from "../ui/index.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";
import ProductCard from "./ProductCard";
import ServiceCard from "./ServiceCard";

const InvoiceItemsForm = () => {
  const {
    currentInvoice,
    expandedSections,
    addItem,
    addService,
    updateItem,
    removeItem,
    toggleProductMetadata: toggleMetadata,
    errors,
    recalculateInvoice,
  } = useInvoiceForm();

  const updateItemImmediate = useCallback(
    (id, data) => {
      updateItem(id, data);
    },
    [updateItem],
  );

  const addItemWithRecalc = useCallback(() => {
    addItem();
  }, [addItem]);

  const addServiceWithRecalc = useCallback(() => {
    addService();
  }, [addService]);

  const removeItemWithRecalc = useCallback(
    (id) => {
      removeItem(id);
    },
    [removeItem],
  );

  const { invoice_items } = currentInvoice;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Invoice Items & Services
            </h2>
            <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
              Add products with warranty tracking or service/repair charges
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={addItemWithRecalc}
              size="sm"
              className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
            <Button
              type="button"
              onClick={addServiceWithRecalc}
              size="sm"
              variant="outline"
              className="inline-flex items-center gap-1.5 text-xs border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Wrench className="w-4 h-4 text-emerald-600" />
              Add Service / Repair
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {invoice_items.length === 0 ? (
            <div className="text-center py-8 sm:py-12 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No Items Added
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 mb-6 px-4">
                Add a product sale or a service/repair charge to build the invoice
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  onClick={addItemWithRecalc}
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
                <Button
                  type="button"
                  onClick={addServiceWithRecalc}
                  variant="outline"
                  className="inline-flex items-center justify-center gap-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Add Service / Repair
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {invoice_items.map((item, index) =>
                item.item_type === "SERVICE" ? (
                  <ServiceCard
                    key={item.id}
                    item={item}
                    index={index}
                    updateItem={updateItem}
                    updateItemImmediate={updateItemImmediate}
                    removeItem={removeItemWithRecalc}
                    errors={errors}
                    recalculateInvoice={recalculateInvoice}
                  />
                ) : (
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
                ),
              )}

              <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-dark-border flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItemWithRecalc}
                  className="flex-1 flex items-center justify-center gap-2 h-11"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Add Another Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addServiceWithRecalc}
                  className="flex-1 flex items-center justify-center gap-2 h-11 border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Add Service / Repair Charge
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
