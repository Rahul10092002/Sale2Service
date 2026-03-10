import React from "react";

const ShortcutTile = ({ label, onClick, icon }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-md shadow-sm hover:shadow-md"
    style={{ minWidth: 72 }}
    aria-label={label}
  >
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
      {icon || "◎"}
    </div>
    <div className="text-xs text-gray-700">{label}</div>
  </button>
);

const ShortcutGrid = ({ items = [] }) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 px-1">
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
