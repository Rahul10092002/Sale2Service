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
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4">
          Upcoming Reminders - {getPeriodLabel()}
        </h3>
        <div className="text-center py-8 text-ink-muted dark:text-slate-500">
          <CalendarClock className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
          <p>No reminders scheduled for {getPeriodLabel().toLowerCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-ink-base dark:text-slate-100">
          Upcoming Reminders - {getPeriodLabel()}
        </h3>
        <span className="self-start sm:self-auto px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-medium rounded-full">
          {allReminders.length} scheduled
        </span>
      </div>

      {/* List */}
      <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
        {allReminders.map((reminder, index) => {
          const Icon = getReminderIcon(reminder.reminderType);
          const colors = getReminderColor(reminder.reminderType);
          const reminderDate = reminder.scheduledDate || reminder.warrantyEndDate;

          return (
            <div
              key={`${reminder.reminderType}-${reminder.id}-${index}`}
              className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-500 hover:shadow-sm transition-all"
            >
              <div className={`p-2 rounded-lg ${colors.bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.badge}`}>
                        {reminder.reminderType === "service" ? "Service" : "Warranty"}
                      </span>
                      {reminder.daysUntil <= 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          {reminder.daysUntil === 0 ? "Due Today" : "Overdue"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink-base dark:text-slate-100 truncate">
                      {reminder.reminderType === "service"
                        ? `${reminder.serviceName} - Visit #${reminder.serviceNumber}`
                        : `${reminder.productName} (${reminder.serialNumber})`}
                    </p>
                    <p className="text-sm text-ink-secondary dark:text-slate-400 truncate">
                      {reminder.customerName}
                    </p>
                    {reminder.reminderType === "warranty" && reminder.invoiceNumber && (
                      <p className="text-xs text-ink-muted dark:text-slate-500 truncate">
                        Invoice: {reminder.invoiceNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col justify-between sm:items-end text-xs sm:text-sm text-ink-secondary dark:text-slate-400 shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{getDaysLabel(reminder.daysUntil)}</span>
                    </div>
                    <p className="font-medium text-ink-base dark:text-slate-300">
                      {format(new Date(reminderDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                {reminder.customerPhone && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-ink-muted dark:text-slate-500 min-w-0">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{reminder.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {serviceReminders.length}
            </p>
            <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">Service</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {warrantyReminders.length}
            </p>
            <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">Warranty</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingReminders;
