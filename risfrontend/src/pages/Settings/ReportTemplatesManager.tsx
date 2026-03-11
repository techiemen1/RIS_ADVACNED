import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

/* ---------------- CONSTANTS ---------------- */


/* ---------------- TYPES ---------------- */
type Template = {
  id?: string;
  name: string;
  modality?: string | null;
  body_part?: string | null;
  gender?: string | null; // M, F, null (Any)
  content: string;
};

/* ---------------- COMPONENT ---------------- */
export default function ReportTemplatesManager() {
  /* ---------------- STATE ---------------- */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customModality, setCustomModality] = useState("");

  const loadModalities = async () => {
    try {
      const r = await axiosInstance.get("/modalities");
      setModalities(r.data || []);
    } catch {
      setModalities([]);
    }
  };

  /* ---------------- EDITOR ---------------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Template content (Findings, Impression, etc.)",
      }),
    ],
    content: editing?.content || "",
    onUpdate({ editor }) {
      if (!editing) return;
      setEditing({ ...editing, content: editor.getHTML() });
    },
  });

  /* ---------------- LOAD ---------------- */
  const load = async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.get("/report-templates");
      setTemplates(r.data?.data || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadModalities();
  }, []);

  /* ---------------- SYNC EDITOR ---------------- */
  useEffect(() => {
    if (editor && editing) {
      editor.commands.setContent(editing.content || "");
    }
  }, [editing, editor]);

  /* ---------------- SAVE ---------------- */
  const save = async () => {
    if (!editing?.name || !editing.content) {
      alert("Template name and content are required");
      return;
    }

    // ✅ Normalize modality correctly
    // Rules:
    // - "Any" → NULL (means match all)
    // - empty / whitespace → NULL
    // - custom values (CT, MR, MG, DXA, etc.) → saved as-is
    const payload = {
      ...editing,
      modality:
        editing.modality && editing.modality.trim() !== "" && editing.modality !== "Any"
          ? editing.modality.trim().toUpperCase()
          : null,

      body_part:
        editing.body_part && editing.body_part.trim() !== ""
          ? editing.body_part.trim()
          : null,

      gender: (!editing.gender || editing.gender === "Any") ? null : editing.gender,
    };

    try {
      if (editing.id) {
        await axiosInstance.put(
          `/report-templates/${editing.id}`,
          payload
        );
      } else {
        await axiosInstance.post(
          "/report-templates",
          payload
        );
      }

      setEditing(null);
      load();
    } catch (err) {
      console.error("Save template failed", err);
      alert("Failed to save template");
    }
  };
  /* ---------------- DISABLE ---------------- */
  const disable = async () => {
    if (!confirmingId) return;
    await axiosInstance.delete(`/report-templates/${confirmingId}`);
    setConfirmingId(null);
    load();
  };

  /* ---------------- RENDER ---------------- */
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Report Templates</CardTitle>
        <Button
          onClick={() =>
            setEditing({ name: "", modality: "Any", body_part: "", gender: "Any", content: "" })
          }
        >
          New Template
        </Button>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LIST */}
        <div className="space-y-2">
          {loading && <div className="text-sm text-gray-500">Loading…</div>}

          {templates.map((t) => (
            <div key={t.id} className="p-3 border rounded bg-white">
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-gray-500">
                {t.modality || "Any"} • {t.body_part || "Any"}
              </div>

              {confirmingId === t.id ? (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={disable}>
                    Confirm Disable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => setEditing(t)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmingId(t.id!)}
                  >
                    Disable
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* EDIT PANEL */}
        <div className="md:col-span-2">
          {editing ? (
            <div className="border rounded p-4 space-y-3 bg-white">
              <Input
                placeholder="Template name"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />

              <select
                className="w-full border rounded px-2 py-2 font-semibold"
                value={editing.modality || "Any"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "Custom") {
                    setEditing({ ...editing, modality: "" });
                  } else {
                    setEditing({ ...editing, modality: v === "Any" ? null : v });
                  }
                }}
              >
                <option value="Any">Match All (Any)</option>
                {modalities.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
                {/* Fallback to defaults if no custom modalities yet */}
                {!modalities.length && ["CR", "CT", "MR", "US", "NM", "XA"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="Custom">Other (Type manually...)</option>
              </select>

              {/* Custom modality input */}
              {editing.modality === "" && (
                <Input
                  placeholder="Enter custom modality (e.g. PT, DXA, MG)"
                  value={customModality}
                  onChange={(e) => {
                    setCustomModality(e.target.value);
                    setEditing({ ...editing, modality: e.target.value });
                  }}
                />
              )}

              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Body Part (e.g. CHEST, BRAIN)"
                  value={editing.body_part || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, body_part: e.target.value })
                  }
                />

                <select
                  className="w-1/3 border rounded px-2 font-semibold"
                  value={editing.gender || "Any"}
                  onChange={(e) => setEditing({ ...editing, gender: e.target.value })}
                >
                  <option value="Any">Gender: Any</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <EditorContent
                editor={editor}
                className="border rounded p-3 min-h-[240px]"
              />

              <div className="flex gap-2">
                <Button onClick={save}>Save</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              Select a template or click “New Template”
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

