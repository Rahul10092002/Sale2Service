import React from "react";
import { CalendarClock, Shield, Clock, Phone } from "lucide-react";
import { format } from "date-fns";

/**
 * UpcomingReminders — service + warranty reminders list with dark mode support.
 */
const UpcomingReminders = ({
  serviceReminders = [],
  warrantyReminders = [],
  period = "today",
}) => {
  const allReminders = [
    ...serviceReminders.map((r) => ({ ...r, reminderType: "service" })),
    ...warrantyReminders.map((r) => ({ ...r, reminderType: "warranty" })),
  ].sort((a, b) => {
    const dateA = a.scheduledDate || a.warrantyEndDate;
    const dateB = b.scheduledDate || b.warrantyEndDate;
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

  const getReminderIcon  = (type) => (type === "service" ? CalendarClock : Shield);

  const getReminderColor = (type) =>
    type === "service"
      ? { bg: "bg-blue-50 dark:bg-blue-900/30",     icon: "text-blue-600 dark:text-blue-400",     badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" }
      : { bg: "bg-purple-50 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300" };

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
          const reminderDate = reminder.scheduledDate || reminder.warrantyEndDate;

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
                      {reminder.reminderType === "service" ? "Service" : "Warranty"}
                    </span>
                    <p className="text-xs font-semibold text-ink-base dark:text-slate-100 truncate">
                      {reminder.reminderType === "service"
                        ? `${reminder.serviceName} - Visit #${reminder.serviceNumber}`
                        : `${reminder.productName} (${reminder.serialNumber})`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-ink-secondary dark:text-slate-400 shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{getDaysLabel(reminder.daysUntil)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[11px] text-ink-secondary dark:text-slate-400 truncate">
                    {reminder.customerName}
                    {reminder.customerPhone ? ` · ${reminder.customerPhone}` : ""}
                  </p>
                  <p className="text-[10px] font-medium text-ink-base dark:text-slate-300 shrink-0">
                    {format(new Date(reminderDate), "MMM dd")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border">
        <div className="flex justify-center divide-x divide-gray-200 dark:divide-dark-border">
          <div className="px-4 text-center">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mr-1">
              {serviceReminders.length}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Service</span>
          </div>
          <div className="px-4 text-center">
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mr-1">
              {warrantyReminders.length}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-slate-500 uppercase tracking-wider">Warranty</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingReminders;
