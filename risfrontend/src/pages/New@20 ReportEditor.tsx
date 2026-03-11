// src/pages/ReportEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { SlashCommand } from "../lib/suggestionConfig";

import {
  Bold, Italic, Underline as UnderlineIcon, Save, Lock, Mic, MicOff,
  AlignLeft, AlignCenter, List, ListOrdered, X, Stethoscope, ImagePlus, Pencil
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import { KeyImage } from "../components/report/KeyImagesPanel";
import ReportTemplatesManager from "./Settings/ReportTemplatesManager";
import { Dialog, DialogContent, DialogTrigger } from "../components/ui/dialog";
import "./ReportEditor.css";

type WorkflowStatus = "draft" | "final";

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
  const [keyImages, setKeyImages] = useState<KeyImage[]>([]);
  const [loading, setLoading] = useState(!initialPatient);
  const [orgSettings, setOrgSettings] = useState<{ name?: string; address?: string; logo?: string }>({});
  const [showKeyImages, setShowKeyImages] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);

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
      SlashCommand,
    ],
    editable: status !== "final",
    editorProps: {
      attributes: {
        class: "print-content focus:outline-none min-h-[300px] prose max-w-none",
      },
    },
  });
  const safeAxios = async (fn: () => Promise<any>, fallback?: any) => {
    try {
      return await fn();
    } catch (err) {
      console.error("API Error:", err);
      return fallback;
    }
  };

  useEffect(() => {
    if (!studyUID) return;
    const load = async () => {
      setLoading(true);

      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/meta`);
        if (r.data?.success) setPatient({ ...patient, ...r.data.data });
      });

      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/dicom-tags`);
        if (r.data?.tags) setPatient((prev) => ({ ...prev, ...r.data.tags }));
      });

      await safeAxios(async () => {
        const r = await axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`);
        const d = r.data?.data;
        if (d) {
          setStatus(d.status || "draft");
          if (d.content) setReportContent(d.content);
        }
      });

      await safeAxios(async () => {
        const r = await axiosInstance.get("/settings");
        if (r.data?.data?.org) setOrgSettings(r.data.data.org);
      });

      setLoading(false);
    };
    load();
  }, [studyUID]);

  useEffect(() => {
    if (editor && reportContent && editor.isEmpty) {
      editor.commands.setContent(reportContent);
    }
  }, [editor, reportContent]);
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
      await axiosInstance.post(`/reports/${encodeURIComponent(studyUID)}/keyimage/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      loadKeyImages();
    });
  };

  const deleteKeyImage = async (id: string) => {
    if (window.confirm("Remove?")) {
      await safeAxios(() => axiosInstance.delete(`/reports/keyimage/${id}`));
      loadKeyImages();
    }
  };

  const insertKeyImageToEditor = (img: KeyImage) => {
    const html = DOMPurify.sanitize(
      `<img src="/api/uploads/keyimages/${img.file_path}" width="220" style="margin:4px;" />`
    );
    editor?.chain().focus().insertContent(html).run();
  };

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        let transcript = DOMPurify.sanitize(e.results[i][0].transcript);
        if (e.results[i].isFinal) text += transcript;
      }
      if (text) editor?.chain().focus().insertContent(text + " ").run();
    };
    recognitionRef.current = rec;
  }, [editor]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }
    if (listening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };
  const save = async (finalize = false) => {
    if (!editor) return;
    const content = DOMPurify.sanitize(editor.getHTML());
    await safeAxios(async () => {
      await axiosInstance.post(finalize ? "/reports/finalize" : "/reports/save", {
        studyUID,
        content,
      });
      if (finalize) {
        setStatus("final");
        editor.setEditable(false);
        onClose?.();
      }
    });
  };

  if (!editor) return null;

  return (
    <div className="flex w-full h-full bg-[#1e293b] text-slate-100 font-sans overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-6 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-slate-300">Loading Study Data...</span>
          </div>
        </div>
      )}

      {/* Left Toolbar */}
      <div className="w-14 bg-[#0f172a] flex flex-col items-center py-4 gap-4 shrink-0 border-r border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg mb-2 shadow-lg">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>

        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={18} />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleDictation}>
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => save(false)}>
          <Save size={20} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => save(true)} disabled={status === "final"}>
          <Lock size={20} />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={22} />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#334155]">
        {/* Floating Status + Smart Templates */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white px-4 py-1.5 rounded-full shadow-lg border border-slate-700/50">
          <span className={`w-2 h-2 rounded-full ${status === "final" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          <span className="text-xs font-bold uppercase">{status}</span>
          <SmartTemplateSelector
            modality={patient?.modality}
            bodyPart={patient?.bodyPart}
            gender={patient?.patientSex}
            onSelect={(html) => editor.chain().focus().insertContent(html).run()}
          />
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-scroll p-6 bg-slate-200/50">
          <EditorContent editor={editor} />
        </div>

        {/* Template Manager Dialog */}
        <div className="absolute top-4 right-8 z-10">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white/80 shadow-sm text-xs h-7">
                <Pencil className="w-3 h-3 mr-1.5" /> Manage Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
              <ReportTemplatesManager />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

function DraggablePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      className="absolute z-50 flex flex-col transition-shadow duration-300"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 flex flex-col h-[500px] overflow-hidden ring-1 ring-black/5">
        {/* Header Bar */}
        <div
          className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-100 cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="bg-blue-100 p-1.5 rounded-md text-blue-600">
              <ImagePlus size={14} />
            </div>
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Key Images</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-slate-200 rounded-full"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}


