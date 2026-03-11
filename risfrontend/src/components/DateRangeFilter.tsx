// src/components/DateRangeFilter.tsx

import React from "react";
import { CalendarRange, RotateCcw } from "lucide-react";

interface Props {
  from: string;
  to: string;
  onChange: (dates: { from: string; to: string }) => void;
  onReset: () => void;
}

export default function DateRangeFilter({ from, to, onChange, onReset }: Props) {
  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ from: e.target.value, to });
  };

  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ from, to: e.target.value });
  };

  return (
    <div className="px-3 py-2 border rounded-lg bg-white shadow-sm flex items-center gap-3">
      <CalendarRange className="w-4 h-4 text-gray-600" />

      {/* FROM */}
      <input
        type="date"
        value={from}
        onChange={handleFrom}
        className="border rounded px-2 py-1 text-sm"
      />

      <span className="text-gray-500 text-sm">to</span>

      {/* TO */}
      <input
        type="date"
        value={to}
        onChange={handleTo}
        className="border rounded px-2 py-1 text-sm"
      />

      {/* RESET BUTTON */}
      <button
        onClick={onReset}
        className="ml-2 px-2 py-1 border rounded bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-xs"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
}

