import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Coins,
} from "lucide-react";
import MetricCard from "../ui/MetricCard.jsx";
import { ROUTES } from "../../utils/constants.js";

/**
 * CustomerLedgerSection Component
 * Dedicated dashboard section showing customer ledger dues, collections,
 * total invoiced, and recovery progress — styled consistently with the rest
 * of the dashboard.
 */
const CustomerLedgerSection = ({ ledger }) => {
  const navigate = useNavigate();

  if (!ledger) return null;

  const totalInvoiced = Number(ledger.totalInvoiced || 0);
  const totalPaid = Number(ledger.totalPaid || 0);
  const totalPending = Number(ledger.totalPendingAmount || 0);
  const totalStoreCredit = Number(ledger.totalStoreCredit || 0);
  const netReceivable = Number(ledger.netReceivable || 0);
  const customersWithDues = Number(ledger.customersWithDues || 0);
  const customersWithInvoices = Number(ledger.customersWithInvoices || 0);
  const customersWithCredit = Number(ledger.customersWithCredit || 0);

  // Compute collection and pending rates
  const collectionRate =
    totalInvoiced > 0
      ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 1000) / 10)
      : 0;

  const pendingRate =
    totalInvoiced > 0
      ? Math.min(100, Math.round((totalPending / totalInvoiced) * 1000) / 10)
      : 0;

  // Fully settled customers (accounts with zero dues and zero credits)
  const settledCustomers = Math.max(
    0,
    customersWithInvoices - customersWithDues - customersWithCredit
  );
  const settledRate =
    customersWithInvoices > 0
      ? Math.round((settledCustomers / customersWithInvoices) * 100)
      : 0;

  return (
    <div className="space-y-2">
      {/* 4 Standard Metric Cards Matching Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2">
        <MetricCard
          title="Pending Dues"
          value={`₹${Math.round(totalPending).toLocaleString("en-IN")}`}
          subtitle={`${customersWithDues} customer${customersWithDues !== 1 ? "s" : ""} with dues`}
          icon={AlertCircle}
          color="red"
          onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=dues`)}
        />
        <MetricCard
          title="Total Collected"
          value={`₹${Math.round(totalPaid).toLocaleString("en-IN")}`}
          subtitle={`${collectionRate}% recovery rate`}
          icon={CheckCircle2}
          color="green"
          onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=collected`)}
        />
        <MetricCard
          title="Ledger Invoiced"
          value={`₹${Math.round(totalInvoiced).toLocaleString("en-IN")}`}
          subtitle={`${customersWithInvoices} customer accounts`}
          icon={FileText}
          color="blue"
          onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=invoiced`)}
        />
        <MetricCard
          title="Store Credit & Advance"
          value={`₹${Math.round(totalStoreCredit).toLocaleString("en-IN")}`}
          subtitle={`${customersWithCredit} customer${customersWithCredit !== 1 ? "s" : ""} with credit`}
          icon={Coins}
          color="purple"
          onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=credit`)}
        />
      </div>

      {/* Recovery Progress & Account Clearance Summary Card */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-3">
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-ink-secondary dark:text-slate-400 font-medium mb-1.5 gap-2">
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=collected`)}
            title="View collected / paid customer accounts"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
            <span>
              Collected: <strong className="text-green-600 dark:text-green-400">₹{Math.round(totalPaid).toLocaleString("en-IN")}</strong> ({collectionRate}%)
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=dues`)}
            title="View customers with pending dues"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
            <span>
              Pending: <strong className="text-red-600 dark:text-red-400">₹{Math.round(totalPending).toLocaleString("en-IN")}</strong> ({pendingRate}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 dark:bg-dark-subtle rounded-full overflow-hidden flex cursor-pointer">
          <div
            className="h-full bg-green-500 dark:bg-green-600 transition-all duration-500 hover:brightness-110"
            style={{ width: `${collectionRate}%` }}
            title={`Collected: ${collectionRate}% (Click to view)`}
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=collected`)}
          />
          <div
            className="h-full bg-red-500 dark:bg-red-600 transition-all duration-500 hover:brightness-110"
            style={{ width: `${pendingRate}%` }}
            title={`Pending: ${pendingRate}% (Click to view)`}
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=dues`)}
          />
        </div>

        {/* Footer Details */}
        <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-slate-500 mt-2 flex-wrap gap-1">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=settled`)}
            title="View settled customer accounts"
          >
            Account Clearance: <strong className="text-ink-base dark:text-slate-300">{settledCustomers}</strong> of <strong className="text-ink-base dark:text-slate-300">{customersWithInvoices}</strong> accounts settled ({settledRate}%)
          </span>
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate(`${ROUTES.CUSTOMERS}?financial_status=dues`)}
            title="View customers with pending dues"
          >
            Net Receivable: <strong className="text-red-600 dark:text-red-400 font-semibold">₹{Math.round(netReceivable).toLocaleString("en-IN")}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedgerSection;
