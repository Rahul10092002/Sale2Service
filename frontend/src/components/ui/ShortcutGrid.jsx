import React from "react";

const ShortcutTile = ({ label, onClick, icon }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 bg-white dark:bg-dark-card rounded-md shadow-sm hover:shadow-md border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-hover min-w-0 flex-shrink-0 transition-all duration-200"
    style={{ width: "clamp(60px, 15vw, 80px)" }}
    aria-label={label}
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center text-ink-secondary dark:text-slate-400 flex-shrink-0">
      {icon || "◎"}
    </div>
    <div className="text-xs text-ink-secondary dark:text-slate-400 text-center leading-tight break-words">
      {label}
    </div>
  </button>
);

const ShortcutGrid = ({ items = [] }) => (
  <div className="w-full">
    <div className="flex gap-2 sm:gap-3 px-1 flex-wrap justify-start">
      {items.map((it, idx) => (
        <ShortcutTile
          key={idx}
          label={it.label}
          onClick={it.onClick}
          icon={it.icon}
        />
      ))}
    </div>
  </div>
);

export default ShortcutGrid;
