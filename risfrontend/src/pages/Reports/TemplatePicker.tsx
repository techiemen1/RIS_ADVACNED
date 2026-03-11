import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";

type Template = {
  id: string;
  name: string;
  content: string;
};

export default function TemplatePicker({ editor, dicom }: any) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const r = await axiosInstance.get("/templates/match", {
        params: {
          modality: dicom?.modality,
          bodyPart: dicom?.body_part,
        },
      });
      setTemplates(r.data?.data || []);
    };
    load();
  }, [dicom?.modality, dicom?.body_part]);

  if (!templates.length) return null;

  const apply = () => {
    const t = templates.find((x) => x.id === selected);
    if (t) editor.commands.insertContent(t.content);
  };

  return (
    <div className="border p-3 mb-4 bg-slate-50 rounded">
      <div className="font-semibold mb-2 text-sm">
        Report Templates
      </div>

      <select
        className="border p-2 w-full mb-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select template…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <Button
        size="sm"
        disabled={!selected}
        onClick={apply}
      >
        Insert Template
      </Button>
    </div>
  );
}

