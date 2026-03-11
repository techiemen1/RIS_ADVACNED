// src/components/report/ReportHeader.tsx
import React from "react";

type Props = {
  meta: { patientName?: string; patientID?: string; accession?: string; modality?: string; studyDate?: string };
  setMeta: (m: any) => void;
  status?: string | null;
  loading?: boolean;
};

export default function ReportHeader({ meta, setMeta, status, loading }: Props) {
  return (
    <div className="bg-white p-3 rounded border">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{meta.patientName || "Patient —"}</div>
          <div className="text-xs text-gray-500">ID: {meta.patientID || "—"}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">Accession</div>
          <div className="font-medium">{meta.accession || "—"}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Modality</div>
          <div>{meta.modality || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Study Date</div>
          <div>{meta.studyDate || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Status</div>
          <div>
            {loading ? "Loading..." : (status ? status.toUpperCase() : "NONE")}
          </div>
        </div>
      </div>
    </div>
  );
}

