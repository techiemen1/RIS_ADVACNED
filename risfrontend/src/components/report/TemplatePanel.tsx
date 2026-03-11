// src/components/report/TemplatePanel.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";

type Props = { meta: any; onInsert: (html: string) => void };

const replaceSmartFields = (tpl: string, meta: any) => {
  return tpl
    .replace(/{{\s*PatientName\s*}}/gi, meta.patientName || "")
    .replace(/{{\s*PatientID\s*}}/gi, meta.patientID || "")
    .replace(/{{\s*Accession\s*}}/gi, meta.accession || "")
    .replace(/{{\s*StudyDate\s*}}/gi, meta.studyDate || "")
    .replace(/{{\s*Modality\s*}}/gi, meta.modality || "");
};

export default function TemplatePanel({ meta, onInsert }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await axiosInstance.get("/report-templates");
        if (mounted) setTemplates(r.data?.data ?? []);
      } catch (err) {}
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = templates.filter(t => !q || (t.name || "").toLowerCase().includes(q.toLowerCase()) || (t.modality || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="text-sm font-semibold mb-2">Templates</div>
      <input placeholder="Search templates..." className="w-full mb-2 px-2 py-1 border rounded" value={q} onChange={(e)=>setQ(e.target.value)} />
      <div className="space-y-2 max-h-[320px] overflow-auto">
        {filtered.map(t => (
          <div key={t.id} className="p-2 border rounded bg-white">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-gray-500">{t.modality || ""}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=> {
                  const html = replaceSmartFields(t.content, meta);
                  onInsert(html);
                }} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">Insert</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-xs text-gray-500">No templates</div>}
      </div>
    </div>
  );
}

