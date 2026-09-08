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

  const duplicateProduct = useCallback(
    (item) => {
      const { id, ...itemData } = item;
      addItem({
        ...itemData,
        serial_number: "", // Fresh serial required for duplicated physical product
      });
    },
    [addItem],
  );

  const duplicateService = useCallback(
    (item) => {
      const { id, ...itemData } = item;
      addService(itemData);
    },
    [addService],
  );

  const { invoice_items } = currentInvoice;

  return (
    <div className="space-y-3">
      <div className="bg-transparent sm:bg-white sm:dark:bg-dark-card sm:rounded-xl sm:border sm:border-gray-200/80 sm:dark:border-dark-border sm:shadow-xs overflow-visible sm:overflow-hidden">
        <div className="px-1 sm:px-4 py-1.5 sm:py-3 border-b-0 sm:border-b sm:border-gray-100 sm:dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2 sm:mb-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600 shrink-0" />
              Invoice Items & Services
            </h2>
            <p className="text-xs text-ink-muted dark:text-slate-400 mt-0.5">
              Add products with warranty tracking or service/repair charges
            </p>
          </div>
          {invoice_items.length > 0 && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={addItemWithRecalc}
                className="inline-flex items-center justify-center gap-1.5 text-xs h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </Button>
              <Button
                type="button"
                onClick={addServiceWithRecalc}
                variant="outline"
                className="inline-flex items-center justify-center gap-1.5 text-xs h-9 px-3 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg bg-white dark:bg-dark-card"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Service</span>
              </Button>
            </div>
          )}
        </div>

        <div className="p-0 sm:p-3.5">
          {invoice_items.length === 0 ? (
            <div className="text-center py-8 sm:py-10 border border-dashed border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card p-4">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">
                No Items Added
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 px-4 max-w-sm mx-auto">
                Add a product sale or a service/repair charge to build the invoice
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  onClick={addItemWithRecalc}
                  className="inline-flex items-center justify-center gap-1.5 text-xs h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </Button>
                <Button
                  type="button"
                  onClick={addServiceWithRecalc}
                  variant="outline"
                  className="inline-flex items-center justify-center gap-1.5 text-xs h-8 px-3 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                >
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  Add Service
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {invoice_items.map((item, index) =>
                item.item_type === "SERVICE" ? (
                  <ServiceCard
                    key={item.id}
                    item={item}
                    index={index}
                    updateItem={updateItem}
                    updateItemImmediate={updateItemImmediate}
                    removeItem={removeItemWithRecalc}
                    duplicateItem={duplicateService}
                    errors={errors}
                    recalculateInvoice={recalculateInvoice}
                  />
                ) : (
                  <ProductCard
                    key={item.id}
                    item={item}
                    index={index}
                    updateItem={updateItem}
                    updateItemImmediate={updateItemImmediate}
                    removeItem={removeItemWithRecalc}
                    duplicateItem={duplicateProduct}
                    errors={errors}
                    recalculateInvoice={recalculateInvoice}
                  />
                ),
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItemWithRecalc}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium border-dashed border-gray-300 dark:border-dark-border text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-dark-card rounded-lg bg-white dark:bg-dark-card"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  Add Another Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addServiceWithRecalc}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg bg-white dark:bg-dark-card"
                >
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
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
