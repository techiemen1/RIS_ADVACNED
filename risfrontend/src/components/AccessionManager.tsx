// src/components/AccessionManager.tsx
import React, { useState } from "react";
import { previewAccession, nextAccession } from "../services/accessionApi";

type Props = {
  prefix?: string;
  modality?: string | null;
  onGenerated?: (row: any) => void;
};

export default function AccessionManager({ prefix = "ACC", modality = null, onGenerated }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    try {
      const r = await previewAccession(prefix);
      setPreview(r?.accession || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const r = await nextAccession(prefix, modality);
      if (r) {
        if (onGenerated) onGenerated(r);
        setPreview(r.accession);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex gap-2 items-center">
        <input className="border p-1 rounded w-32" value={prefix} readOnly />
        <button className="px-3 py-1 bg-gray-200 rounded" onClick={handlePreview}>Preview</button>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      <div className="mt-2 text-sm">
        Preview: <span className="font-mono">{preview || "—"}</span>
      </div>
    </div>
  );
}
