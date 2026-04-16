import React from "react";
import { CalendarClock, Shield, Clock, Phone, Cake, Gift, CreditCard, PartyPopper } from "lucide-react";
import { format } from "date-fns";

/**
 * UpcomingReminders — service + warranty reminders list with dark mode support.
 */
const UpcomingReminders = ({
  serviceReminders = [],
  warrantyReminders = [],
  wishes = [],
  festivals = [],
  period = "today",
}) => {
  const allReminders = [
    ...serviceReminders.map((r) => ({ ...r, reminderType: "service" })),
    ...warrantyReminders.map((r) => ({ ...r, reminderType: "warranty" })),
    ...wishes.map((r) => ({ ...r, reminderType: r.type })), // birthday or anniversary
    ...festivals.map((r) => ({ ...r, reminderType: "festival" })),
  ].sort((a, b) => {
    const dateA = a.date || a.scheduledDate || a.warrantyEndDate;
    const dateB = b.date || b.scheduledDate || b.warrantyEndDate;
    return new Date(dateA) - new Date(dateB);
  });

  const getPeriodLabel = () => {
    switch (period) {
      case "today": return "Today";
      case "week":  return "This Week";
      case "month": return "This Month";
      default:      return period;
    }
  };

  const getReminderIcon  = (type) => {
    switch (type) {
      case "service": return CalendarClock;
      case "warranty": return Shield;
      case "birthday": return Cake;
      case "anniversary": return Gift;
      case "festival": return PartyPopper;
      case "payment": return CreditCard;
      default: return Clock;
    }
  };

  const getReminderColor = (type) => {
    switch (type) {
      case "service":
        return { bg: "bg-blue-50 dark:bg-blue-900/30",     icon: "text-blue-600 dark:text-blue-400",     badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" };
      case "warranty":
        return { bg: "bg-purple-50 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300" };
      case "birthday":
        return { bg: "bg-pink-50 dark:bg-pink-900/30",     icon: "text-pink-600 dark:text-pink-400",     badge: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300" };
      case "anniversary":
        return { bg: "bg-rose-50 dark:bg-rose-900/30",     icon: "text-rose-600 dark:text-rose-400",     badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300" };
      case "festival":
        return { bg: "bg-amber-50 dark:bg-amber-900/30",   icon: "text-amber-600 dark:text-amber-400",   badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300" };
      case "payment":
        return { bg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" };
      default:
        return { bg: "bg-gray-50 dark:bg-dark-subtle",    icon: "text-gray-600 dark:text-slate-400",    badge: "bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-slate-300" };
    }
  };

  const getDaysLabel = (daysUntil) => {
    if (daysUntil < 0)  return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""}`;
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;
  };

  if (allReminders.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-3">
        <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
          Upcoming Reminders - {getPeriodLabel()}
        </h3>
        <div className="text-center py-4 text-xs text-ink-muted dark:text-slate-500">
          <CalendarClock className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
          <p>No reminders scheduled for {getPeriodLabel().toLowerCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100">
          Upcoming Reminders - {getPeriodLabel()}
        </h3>
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-medium rounded-full shrink-0">
          {allReminders.length} scheduled
        </span>
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
        {allReminders.map((reminder, index) => {
          const Icon = getReminderIcon(reminder.reminderType);
          const colors = getReminderColor(reminder.reminderType);
          const reminderDate = reminder.date || reminder.scheduledDate || reminder.warrantyEndDate;

          return (
            <div
              key={`${reminder.reminderType}-${reminder.id}-${index}`}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-500 hover:shadow-sm transition-all"
            >
              <div className={`p-1.5 rounded-md ${colors.bg} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${colors.badge} shrink-0`}>
                      {reminder.label || reminder.reminderType.charAt(0).toUpperCase() + reminder.reminderType.slice(1)}
                    </span>
                    <p className="text-xs font-semibold text-ink-base dark:text-slate-100 truncate">
                      {reminder.reminderType === "service"
                        ? `${reminder.serviceName} - Visit #${reminder.serviceNumber}`
                        : reminder.reminderType === "warranty"
                        ? `${reminder.productName} (${reminder.serialNumber})`
                        : reminder.reminderType === "festival"
                        ? reminder.festivalName
                        : reminder.customerName}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-ink-secondary dark:text-slate-400">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{getDaysLabel(reminder.daysUntil)}</span>
                    </div>
                    {reminder.reminderStatus && (
                      <span className={`text-[10px] px-1 py-0.5 rounded font-bold uppercase tracking-tighter ${
                        ["SENT", "DELIVERED", "READ"].includes(reminder.reminderStatus) 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : reminder.reminderStatus === "FAILED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>
                        {reminder.reminderStatus === "SENT" || reminder.reminderStatus === "DELIVERED" || reminder.reminderStatus === "READ" 
                          ? "Sent" : reminder.reminderStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[11px] text-ink-secondary dark:text-slate-400 truncate">
                    {reminder.reminderType === "festival" 
                      ? "Special Occasion"
                      : `${reminder.customerName}${reminder.customerPhone ? ` · ${reminder.customerPhone}` : ""}`}
                  </p>
                  <p className="text-[10px] font-medium text-ink-base dark:text-slate-300 shrink-0">
                    {reminderDate ? format(new Date(reminderDate), "MMM dd") : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border">
        <div className="flex justify-center flex-wrap gap-y-2 divide-x divide-gray-200 dark:divide-dark-border">
          <div className="px-3 text-center">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mr-1">
              {serviceReminders.length}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Service</span>
          </div>
          <div className="px-3 text-center">
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mr-1">
              {warrantyReminders.length}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Warranty</span>
          </div>
          <div className="px-3 text-center">
            <span className="text-sm font-bold text-pink-600 dark:text-pink-400 mr-1">
              {wishes.length}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Wishes</span>
          </div>
          {festivals.length > 0 && (
            <div className="px-3 text-center">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mr-1">
                {festivals.length}
              </span>
              <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Festivals</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingReminders;
