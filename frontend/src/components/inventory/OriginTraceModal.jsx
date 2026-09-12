import React from "react";
import { Link } from "react-router-dom";
import { Building2, FileText, ExternalLink } from "lucide-react";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "../ui/index.js";

/**
 * OriginTraceModal displays dealer / supplier origin trace and purchase bill attachments
 * for any inventory/invoice item.
 */
export default function OriginTraceModal({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;

  const dealer = item.dealer_id || {};
  const purchaseSource = item.purchase_source || dealer.name || "N/A";
  const purchaseDate = item.purchase_date
    ? new Date(item.purchase_date).toLocaleDateString("en-IN")
    : "N/A";

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
          <Building2 className="w-5 h-5" />
          <span>Supplier Origin Trace & Audit Details</span>
        </div>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4 text-xs">
          {/* Item Summary Card */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                {item.product_name || item.name || "Product Item"}
              </h4>
              <p className="font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 font-semibold">
                Serial #: {item.serial_number || "N/A"}
              </p>
            </div>
            {item._id && (
              <Link
                to={`/products/${item._id}`}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg font-bold border border-gray-300 dark:border-gray-600 flex items-center gap-1 hover:underline text-xs shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Product Details
              </Link>
            )}
          </div>

          {/* Dealer / Supplier Info */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
            <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Linked Supplier / Dealer Profile
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dealer Name</span>
                <strong className="text-gray-900 dark:text-white text-sm">
                  {dealer.name || purchaseSource}
                </strong>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Contact Person</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {dealer.contact_person || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Phone Number</span>
                <span className="text-gray-900 dark:text-white font-mono font-bold">
                  {dealer.phone || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Email</span>
                <span className="text-gray-900 dark:text-white">
                  {dealer.email || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Tax ID / GSTIN</span>
                <span className="text-gray-900 dark:text-white font-mono">
                  {dealer.tax_id || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Physical Address</span>
                <span className="text-gray-900 dark:text-white">
                  {dealer.address || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Reference Info */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
            <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Supplier Intake Reference
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dealer Invoice / Bill #</span>
                <strong className="font-mono text-gray-900 dark:text-white uppercase text-sm">
                  {item.purchase_invoice_ref || item.dealer_invoice_no || "N/A"}
                </strong>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Intake Purchase Date</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {purchaseDate}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Bill Image Attachment (if available) */}
          {item.purchase_bill_image && (
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                📄 Purchase Bill Photo / Invoice Document
              </h5>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 rounded overflow-hidden border border-gray-300 dark:border-gray-600 shrink-0">
                  <img
                    src={item.purchase_bill_image}
                    alt="Purchase Bill"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                    Supplier Physical Bill Copy
                  </span>
                  <a
                    href={item.purchase_bill_image}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View / Download Full Image
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close Trace
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
