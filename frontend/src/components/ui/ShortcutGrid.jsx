import React from "react";

const ShortcutTile = ({ label, onClick, icon }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 bg-white rounded-md shadow-sm hover:shadow-md min-w-0 flex-shrink-0"
    style={{ width: "clamp(60px, 15vw, 80px)" }}
    aria-label={label}
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 flex-shrink-0">
      {icon || "◎"}
    </div>
    <div className="text-xs text-gray-700 text-center leading-tight break-words">
      {label}
    </div>
  </button>
);

const ShortcutGrid = ({ items = [] }) => {
  return (
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
};

export default ShortcutGrid;
