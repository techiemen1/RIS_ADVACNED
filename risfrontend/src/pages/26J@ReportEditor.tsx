// ===============================
// src/pages/ReportEditor.tsx
// ===============================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import DOMPurify from "dompurify";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import ImageExtension from "@tiptap/extension-image";

import { enrichPatientPatch } from "../utils/patientParse";
import { resolveFinalTitle } from "../utils/titleLogic";

import {
  Bold, Italic, Underline as UnderIcon, Save, Lock,
  AlignLeft, AlignCenter, List, ListOrdered,
  X, Stethoscope, ImagePlus, Printer
} from "lucide-react";

import { Button } from "../components/ui/button";
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import ReportTemplatesManager from "./Settings/ReportTemplatesManager";

import DraggablePanel from "../components/report/DraggablePanel";
import "./ReportEditor.css";
type WorkflowStatus = "draft" | "preliminary" | "final" | "addendum";

type PatientMeta = {
  patientName?: string;
  patientID?: string;
  modality?: string;
  accessionNumber?: string;
  studyDate?: string;
  patientSex?: string;
  patientAge?: string;
  referringPhysician?: string;
  bodyPart?: string;
  created_at?: string;
};

export default function ReportEditor({
  studyUID: propStudyUID,
  initialPatient,
  onClose,
}: {
  studyUID?: string;
  initialPatient?: PatientMeta;
  onClose?: () => void;
}) {

  const params = useParams();
  const studyUID = propStudyUID || params.studyId || "";

  const [status, setStatus] = useState<WorkflowStatus>("draft");
  const [patient, setPatient] = useState<PatientMeta | null>(initialPatient || null);
  const [keyImages, setKeyImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialPatient);
  const [orgSettings, setOrgSettings] = useState<any>({});
  const [reportContent, setReportContent] = useState<string | null>(null);

  // Mode-C title hybrid
  const [manualTitle, setManualTitle] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Type report content here…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      ImageExtension,
    ],
    editable: status !== "final",
    editorProps: {
      attributes: {
        class: "print-content focus:outline-none min-h-[300px] prose max-w-none",
      },
    },
  });
  const safeAxios = async (fn: () => Promise<any>, fallback?: any) => {
    try { return await fn(); } catch { return fallback; }
  };

  const updatePatient = (key: keyof PatientMeta, val: string) => {
    setPatient(prev => enrichPatientPatch(prev, key, val));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    if (/^\d{8}$/.test(dateStr))
      return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString("en-GB") : dateStr;
  };

  const header = useMemo(() => ({
    studyDate: formatDate(patient?.studyDate || patient?.created_at),
    reportDate: new Date().toLocaleDateString("en-GB"),
  }), [patient]);

  // Load Patient + Content + Org
  useEffect(() => {
    if (!studyUID || !editor) return;
    setLoading(true);

    safeAxios(async () => {
      const r = await axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`);
      if (!r?.data) return;

      const enriched = enrichPatientPatch(r.data.patient || {}, null, null);
      setPatient(enriched);
      setOrgSettings(r.data.organization || {});
      if (r.data.content) editor.commands.setContent(r.data.content);
    }).finally(() => setLoading(false));
  }, [studyUID, editor]);

  // P3 — extract age/sex from name once
  useEffect(() => {
    if (patient?.patientName) {
      setPatient(p => enrichPatientPatch(p, "patientName", p?.patientName || ""));
    }
  }, [patient?.patientName]);

  // Title hybrid sync
  useEffect(() => {
    if (manualTitle.trim() !== "") return;
    if (!patient) return;
    const auto = resolveFinalTitle({
      manualTitle: "",
      modality: patient.modality,
      bodyPart: patient.bodyPart,
    });
    setManualTitle(auto);
  }, [patient?.modality, patient?.bodyPart]);

  const computedTitle = useMemo(() =>
    resolveFinalTitle({
      manualTitle,
      modality: patient?.modality,
      bodyPart: patient?.bodyPart,
    }),
    [manualTitle, patient]);
  // -------------------------------
  // SAVE / FINALIZE
  // -------------------------------
  const save = async (finalize = false) => {
    if (!editor) return;

    const content = editor.getHTML();

    await safeAxios(async () => {
      await axiosInstance.post("/reports/save", {
        studyUID,
        content,
        patientName: patient?.patientName,
        patientID: patient?.patientID,
        modality: patient?.modality,
        accessionNumber: patient?.accessionNumber,
        studyDate: patient?.studyDate,
        referringPhysician: patient?.referringPhysician,
        workflow_status: finalize
          ? (status === "addendum" ? "addendum" : "final")
          : status
      });

      if (finalize) {
        setStatus(status === "addendum" ? "addendum" : "final");
        editor?.setEditable(false);
        alert("Finalized successfully!");
        onClose?.();
      } else {
        alert("Draft saved!");
      }
    });
  };

  // -------------------------------
  // PRINT — P1 MODE
  // -------------------------------
  const handlePrint = () => {
    window.print();
  };

  // -------------------------------
  // KEY IMAGES
  // -------------------------------
  const loadKeyImages = async () => {
    const r = await safeAxios(() =>
      axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}/keyimages`)
    );
    setKeyImages(r?.data?.data || []);
  };

  const uploadKeyImage = async (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    await safeAxios(async () => {
      await axiosInstance.post(
        `/reports/${encodeURIComponent(studyUID)}/keyimage/upload`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      loadKeyImages();
    });
  };

  const deleteKeyImage = async (id: string) => {
    if (!confirm("Remove image?")) return;
    await safeAxios(() => axiosInstance.delete(`/reports/keyimage/${id}`));
    loadKeyImages();
  };

  const insertKeyImageToEditor = (img: any) => {
    const html = DOMPurify.sanitize(
      `<img src="/api/uploads/keyimages/${img.file_path}" style="width:220px; margin:4px; display:inline-block;" />`
    );
    editor?.chain().focus().insertContent(html).run();
  };
  {/* LEFT TOOLBAR */ }
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">

      <div className="w-14 bg-[#0f172a] flex flex-col items-center py-3 gap-3 shrink-0 border-r border-slate-800 z-50 no-print">
        <div className="bg-blue-600 p-2 rounded-lg shadow-md">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>

        {/* Formatting */}
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={16} className="text-slate-400 hover:text-white" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={16} className="text-slate-400 hover:text-white" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderIcon size={16} className="text-slate-400 hover:text-white" />
        </Button>

        <div className="w-6 h-px bg-slate-700" />

        {/* Alignment */}
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={16} className="text-slate-400 hover:text-white" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={16} className="text-slate-400 hover:text-white" />
        </Button>

        <div className="w-6 h-px bg-slate-700" />

        {/* Lists */}
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={16} className="text-slate-400 hover:text-white" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} className="text-slate-400 hover:text-white" />
        </Button>

        <div className="flex-1" />

        {/* Key Images Toggle / Panel */}
        {/* We keep the panel here logic-wise */}
        {keyImages.length > 0 && (
          <DraggablePanel defaultX={1280} defaultY={180}>
            <div className="w-[240px] bg-white border border-slate-300 rounded-b-lg shadow-lg">
              <div className="p-2 bg-slate-900 text-white text-[10px] uppercase tracking-wide font-semibold rounded-t-none rounded-b-none">
                Key Images
              </div>
              <div className="max-h-[280px] overflow-y-auto p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                {keyImages.map(img => (
                  <div key={img.id} className="relative border border-slate-300 rounded-lg overflow-hidden">
                    <img
                      src={`/api/uploads/keyimages/${img.file_path}`}
                      className="w-full object-cover cursor-pointer"
                      onClick={() => insertKeyImageToEditor(img)}
                    />
                    <button
                      className="absolute top-1 right-1 bg-white text-red-600 border border-slate-300 rounded px-1 text-[9px]"
                      onClick={() => deleteKeyImage(img.id)}
                    >
                      X
                    </button>
                  </div>
                ))}
                {/* UPLOAD BUTTON */}
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-20 cursor-pointer text-slate-400 text-[10px]">
                  Upload
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadKeyImage(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </DraggablePanel>
        )}

        {/* Save / Final / Close */}
        <Button size="icon" variant="ghost" onClick={() => save(false)} className="text-emerald-400 hover:bg-slate-800">
          <Save size={18} />
        </Button>

        <Button size="icon" variant="ghost" disabled={status === "final"} onClick={() => save(true)} className="text-blue-400 hover:bg-slate-800">
          <Lock size={18} />
        </Button>

        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} className="text-red-400 hover:bg-slate-800">
            <X size={20} />
          </Button>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* TOP ACTION BAR */}
        <div className="h-12 border-b bg-white flex items-center px-4 justify-between shrink-0 z-40 no-print">
          <div className="flex items-center gap-4">
            <div className="font-semibold text-slate-600">Report Editor</div>
            <div className="h-4 w-px bg-gray-300" />
            <SmartTemplateSelector
              modality={patient?.modality}
              bodyPart={patient?.bodyPart}
              gender={patient?.patientSex}
              onSelect={(content) => editor?.commands.setContent(content)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>

        {/* SCROLLABLE PAPER AREA */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100/50 custom-scrollbar">
          <div className="printable-area shadow-2xl relative p-[10mm]">

            {/* PATIENT HEADER */}
            <table className="patient-info-table">
              <tbody>
                <tr>
                  <td className="label-cell">Patient Name</td>
                  <td className="value-cell">
                    <input
                      className="field-input"
                      value={patient?.patientName || ""}
                      onChange={e => updatePatient("patientName", e.target.value)}
                    />
                  </td>
                  <td className="label-cell">ID</td>
                  <td className="value-cell">{patient?.patientID}</td>
                  <td className="label-cell">Sex/Age</td>
                  <td className="value-cell">{patient?.patientSex || "—"} / {patient?.patientAge || "—"}</td>
                </tr>
                <tr>
                  <td className="label-cell">Ref. Doctor</td>
                  <td className="value-cell" colSpan={3}>
                    <input
                      className="field-input"
                      value={patient?.referringPhysician || ""}
                      onChange={e => updatePatient("referringPhysician", e.target.value)}
                    />
                  </td>
                  <td className="label-cell">Date</td>
                  <td className="value-cell">{header.studyDate}</td>
                </tr>
                <tr>
                  <td className="label-cell">Exam</td>
                  <td className="value-cell" colSpan={5}>
                    {patient?.modality} — {patient?.bodyPart}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TITLE */}
            <input
              className="field-input title-field text-center uppercase"
              value={manualTitle || computedTitle}
              onChange={e => setManualTitle(e.target.value)}
              placeholder="REPORT TITLE"
            />

            {/* EDITOR */}
            <EditorContent editor={editor} />

            {/* SIGNATURE BLOCK */}
            <div className="signature-block">
              <div className="text-xs text-slate-500">
                {status === "final" ? "Electronically Signed" : "Draft Report"}
              </div>
            </div>

            {/* FOOTER */}
            <div className="report-footer">
              <p className="font-bold text-slate-700">RADIOLOGY DEPARTMENT</p>
              <p className="text-slate-500">This is a computer-generated report.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

