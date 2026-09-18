import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  useGetRecycleBinItemsQuery,
  useRestoreRecycleBinItemMutation,
  usePermanentlyDeleteRecycleBinItemMutation,
  useEmptyRecycleBinMutation,
} from "../../features/recycleBin/recycleBinApi.js";
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  RefreshCw,
  Receipt,
  User,
  Box,
  Table,
  Truck,
  Calendar,
  Users,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";

const CATEGORIES = [
  { id: "all", label: "All Items", icon: Layers },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "customers", label: "Customers", icon: User },
  { id: "products", label: "Products", icon: Box },
  { id: "inventory", label: "Purchases", icon: Table },
  { id: "dealers", label: "Suppliers", icon: Truck },
  { id: "festivalSchedule", label: "Schedules", icon: Calendar },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
];

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 dark:hover:border-slate-500";

const RecycleBin = () => {
  const dispatch = useDispatch();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // "permanent" | "empty"
    item: null,
  });

  const { data, isLoading, isFetching, refetch } = useGetRecycleBinItemsQuery({
    entity_type: selectedCategory,
    search: searchTerm,
    page,
    limit: 25,
  });

  const [restoreItem, { isLoading: isRestoring }] =
    useRestoreRecycleBinItemMutation();
  const [permanentlyDelete, { isLoading: isDeletingPerm }] =
    usePermanentlyDeleteRecycleBinItemMutation();
  const [emptyRecycleBin, { isLoading: isEmptying }] =
    useEmptyRecycleBinMutation();

  const binData = data?.data || {};
  const items = binData.items || [];
  const counts = binData.counts || {};
  const pagination = binData.pagination || { total: 0, pages: 1, page: 1 };

  const handleRestore = async (item) => {
    try {
      await restoreItem({
        entity_type: item.entity_type,
        id: item.id,
      }).unwrap();

      dispatch(
        showToast({
          message: `${item.display_name} restored successfully!`,
          type: "success",
        })
      );
    } catch (error) {
      dispatch(
        showToast({
          message: error?.data?.message || "Failed to restore item",
          type: "error",
        })
      );
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.type) return;

    try {
      if (confirmModal.type === "permanent" && confirmModal.item) {
        await permanentlyDelete({
          entity_type: confirmModal.item.entity_type,
          id: confirmModal.item.id,
        }).unwrap();

        dispatch(
          showToast({
            message: `${confirmModal.item.display_name} permanently deleted.`,
            type: "success",
          })
        );
      } else if (confirmModal.type === "empty") {
        const res = await emptyRecycleBin({
          entity_type: selectedCategory,
        }).unwrap();

        dispatch(
          showToast({
            message: res?.message || "Recycle bin cleared successfully!",
            type: "success",
          })
        );
      }
    } catch (error) {
      dispatch(
        showToast({
          message: error?.data?.message || "Action failed",
          type: "error",
        })
      );
    } finally {
      setConfirmModal({ isOpen: false, type: null, item: null });
    }
  };

  const getEntityIcon = (entity_type) => {
    const found = CATEGORIES.find((c) => c.id === entity_type);
    if (!found) return <Trash2 className="w-4 h-4 text-gray-400" />;
    const IconComp = found.icon;
    return <IconComp className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-base dark:text-slate-100 flex items-center gap-2.5">
            <span>Recycle Bin</span>
            {counts.all > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                {counts.all}
              </span>
            )}
          </h1>
          <p className="text-sm text-ink-muted dark:text-slate-400 mt-0.5">
            Manage soft-deleted items — restore accidentally deleted records or permanently purge them
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-dark-hover transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {counts.all > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmModal({ isOpen: true, type: "empty", item: null })}
              disabled={isEmptying}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Recycle Bin</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 space-y-3.5 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search deleted records by name, invoice #, customer, phone..."
            className={inputCls + " pl-10"}
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {CATEGORIES.map((cat) => {
            const count = counts[cat.id] || 0;
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-dark-subtle text-ink-muted dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-dark-hover hover:text-ink-base"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded ${
                    isSelected
                      ? "bg-blue-700 text-white"
                      : "bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deleted Items Table Container */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-ink-muted dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs">Loading deleted items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-medium text-ink-base dark:text-slate-100">
              No deleted items
            </h3>
            <p className="text-xs text-ink-muted dark:text-slate-400 mt-1">
              {searchTerm
                ? "No soft-deleted records match your search phrase."
                : "The Recycle Bin is empty for this category."}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[60px_140px_2fr_180px_210px] gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-dark-subtle p-4 border-b border-gray-200 dark:border-dark-border">
              <div>S No.</div>
              <div>Category</div>
              <div>Item Details</div>
              <div>Deleted Date</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Rows */}
            {items.map((item, index) => {
              const serialNo = (pagination.page - 1) * 25 + index + 1;

              return (
                <div
                  key={`${item.entity_type}-${item.id}`}
                  className={`p-4 md:px-4 md:py-3.5 flex flex-col md:grid md:grid-cols-[60px_140px_2fr_180px_210px] gap-2 md:items-center border-b border-gray-100 dark:border-dark-border/80 last:border-b-0 transition-all ${
                    index % 2 === 0
                      ? "bg-white dark:bg-dark-card"
                      : "bg-gray-50/60 dark:bg-dark-subtle/50"
                  } hover:bg-blue-50/30 dark:hover:bg-slate-800/40`}
                >
                  {/* Serial No. (Desktop) */}
                  <div className="hidden md:block text-xs font-medium text-ink-muted dark:text-slate-400">
                    {serialNo}
                  </div>

                  {/* Category Pill */}
                  <div className="flex items-center gap-2">
                    <span className="md:hidden text-xs font-semibold text-gray-400">
                      #{serialNo}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                      {getEntityIcon(item.entity_type)}
                      <span>{item.entity_label}</span>
                    </span>
                  </div>

                  {/* Item Primary & Subtitle */}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink-base dark:text-slate-100 truncate">
                      {item.display_name}
                    </div>
                    <div className="text-xs text-ink-muted dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>

                  {/* Deleted Date */}
                  <div className="text-xs text-ink-secondary dark:text-slate-400">
                    <span className="md:hidden text-gray-400 mr-1">Deleted:</span>
                    {new Date(item.deleted_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-dark-border">
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      disabled={isRestoring}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          type: "permanent",
                          item,
                        })
                      }
                      disabled={isDeletingPerm}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-dark-subtle border-t border-gray-200 dark:border-dark-border flex items-center justify-between text-xs text-ink-muted dark:text-slate-400">
            <span>
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-white dark:hover:bg-dark-hover disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-white dark:hover:bg-dark-hover disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Standard Confirmation Dialog */}
      <Dialog
        open={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, item: null })}
        maxWidth="md"
      >
        <DialogHeader
          onClose={() => setConfirmModal({ isOpen: false, type: null, item: null })}
        >
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>
              {confirmModal.type === "empty"
                ? "Empty Recycle Bin?"
                : "Permanently Delete Record?"}
            </span>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <p className="text-sm text-ink-secondary dark:text-slate-300">
            {confirmModal.type === "empty"
              ? "This operation will permanently delete all soft-deleted records from the database. This action cannot be reversed."
              : `Are you sure you want to permanently delete "${confirmModal.item?.display_name}"? This record will be permanently purged.`}
          </p>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmModal({ isOpen: false, type: null, item: null })}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmAction}
            loading={isDeletingPerm || isEmptying}
          >
            {confirmModal.type === "empty" ? "Empty Recycle Bin" : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default RecycleBin;
