// src/components/report/ReportSections.tsx
import React from "react";

type Props = { onInsert?: (key:string)=>void };

export default function ReportSections({ onInsert }: Props) {
  const sections = [
    { key: "history", label: "History", html: "<h3>CLINICAL HISTORY:</h3><p><br/></p>" },
    { key: "technique", label: "Technique", html: "<h3>TECHNIQUE:</h3><p><br/></p>" },
    { key: "findings", label: "Findings", html: "<h3>FINDINGS:</h3><p><br/></p>" },
    { key: "impression", label: "Impression", html: "<h3>IMPRESSION:</h3><p><br/></p>" },
  ];

  return (
    <div>
      <div className="text-sm font-semibold mb-2">Sections</div>
      <div className="flex flex-col gap-2">
        {sections.map(s => (
          <button key={s.key} className="text-left p-2 rounded hover:bg-gray-100" onClick={() => {
            // emit event
            const ev = new CustomEvent("insert-template-html", { detail: { html: s.html }});
            window.dispatchEvent(ev);
            if (onInsert) onInsert(s.key);
          }}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

