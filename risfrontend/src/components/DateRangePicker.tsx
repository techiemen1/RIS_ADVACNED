// src/components/DateRangePicker.tsx
import React, { useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file

interface Props {
  value: { start: Date; end: Date };
  onChange: (val: { start: Date; end: Date }) => void;
  align?: "left" | "right";
}

export default function DateFilter({ value, onChange, align = "left" }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (ranges: any) => {
    const { startDate, endDate } = ranges.selection;
    onChange({ start: startDate, end: endDate });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 bg-white border border-slate-200 rounded-md shadow-sm text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
      >
        <span className="font-medium text-slate-500 text-xs uppercase">Date:</span>
        {value.start.toISOString().slice(0, 10)}
        <span className="text-slate-300">→</span>
        {value.end.toISOString().slice(0, 10)}
      </button>

      {open && (
        <div className={`absolute z-50 mt-2 shadow-xl bg-white border rounded-lg overflow-hidden text-left text-slate-900 ${align === "right" ? "right-0" : "left-0"}`}>
          <DateRangePicker
            ranges={[
              {
                startDate: value.start,
                endDate: value.end,
                key: "selection",
              },
            ]}
            onChange={handleSelect}
            months={1}
            direction="horizontal"
            moveRangeOnFirstSelection={false}
            rangeColors={["#4f46e5"]}
          />
          <div className="flex justify-end gap-2 p-2 border-t bg-slate-50">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 text-xs font-medium border rounded hover:bg-white text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

