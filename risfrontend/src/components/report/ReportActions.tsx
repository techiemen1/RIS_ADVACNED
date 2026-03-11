// src/components/report/ReportActions.tsx
import React, { useState } from "react";
import { Button } from "../../components/ui/button";

type Props = {
  status?: string | null;
  onSaveDraft: () => void;
  onFinalize: (signerName: string) => void;
  onDownloadPdf: () => void;
  onClose?: () => void;
};

export default function ReportActions({ status, onSaveDraft, onFinalize, onDownloadPdf, onClose }: Props) {
  const [signer, setSigner] = useState("");

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button onClick={onSaveDraft}>Save Draft</Button>
        <Button onClick={() => {
          const s = signer || prompt("Enter signing physician name") || "";
          if (!s) return alert("Signer required");
          onFinalize(s);
        }} variant="destructive">Finalize</Button>
        <Button onClick={onDownloadPdf}>PDF</Button>
      </div>

      <div className="flex items-center gap-2">
        <input className="px-2 py-1 border rounded text-sm" placeholder="Signer name (for finalize)" value={signer} onChange={(e) => setSigner(e.target.value)} />
        {onClose && <Button variant="outline" onClick={onClose}>Close</Button>}
      </div>
    </div>
  );
}

