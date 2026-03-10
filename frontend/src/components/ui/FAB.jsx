import React, { useState } from "react";
import Button from "./Button.jsx";

const QuickAction = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white shadow-sm hover:shadow-md text-sm"
    aria-label={label}
  >
    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-700">
      •
    </span>
    <span>{label}</span>
  </button>
);

const FAB = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
          {actions.map((a, i) => (
            <QuickAction
              key={i}
              label={a.label}
              onClick={() => {
                setOpen(false);
                if (a.onClick) a.onClick();
              }}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setOpen((s) => !s)}
          aria-expanded={open}
          aria-label="Quick actions"
          className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700"
        >
          {open ? "✕" : "+"}
        </button>
      </div>
    </div>
  );
};

export default FAB;
