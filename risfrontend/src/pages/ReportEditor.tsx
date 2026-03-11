// src/pages/ReportEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import DOMPurify from "dompurify";
// @ts-ignore
import html2pdf from "html2pdf.js";

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
  Bold, Italic, Underline as UnderlineIcon, Save, Lock, Unlock, Mic, MicOff,
  AlignLeft, AlignCenter, AlignJustify, List, ListOrdered, X, Stethoscope, ImagePlus, Pencil,
  Phone, Siren, Mail, Globe, Printer, Eye, Strikethrough, Type, Sigma, AlertTriangle,
  Table as TableIcon, Minus, Trash2, Info, History, Calendar, ChevronRight, ExternalLink, RefreshCcw, Command,
  Server, MessageSquare, Monitor, GripVertical, Columns, Maximize2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import { KeyImage } from "../components/report/KeyImagesPanel";
import { CompactDicomViewer } from "../components/report/CompactDicomViewer";
import { Node, mergeAttributes, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import useDictation from "../hooks/useDictation";
import "./ReportEditor.css";
import { generateSmartContent } from "../lib/smartReporting";
import { toast } from "react-hot-toast";

const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption',
  draggable: true,
  // Make sure to allow class attribute
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class };
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'figure' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes), 0];
  },
});

const Figcaption = Node.create({
  name: 'figcaption',
  group: 'block',
  content: 'text*',
  selectable: true,
  parseHTML() {
    return [
      { tag: 'figcaption' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(HTMLAttributes), 0];
  },
});

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
  clinical?: any;
};

type PriorStudy = {
  studyUID: string;
  accession: string;
  modality: string;
  description: string;
  date: string;
  reportStatus: WorkflowStatus | null;
};

export default function ReportEditor({
  studyUID: propStudyUID,
  initialPatient,
  hideViewer = false,
  onClose,
}: {
  studyUID?: string;
  initialPatient?: PatientMeta;
  hideViewer?: boolean;
  onClose?: () => void;
}) {
  const params = useParams();
  const studyUID = propStudyUID || params.studyId || "";

  const [status, setStatus] = useState<WorkflowStatus>("draft");
  const [patient, setPatient] = useState<PatientMeta | null>(initialPatient || null);
  const [keyImages, setKeyImages] = useState<KeyImage[]>([]);
  const [loading, setLoading] = useState(!initialPatient);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowNote, setWorkflowNote] = useState<string>("");
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true);
  const [clinicalHistory, setClinicalHistory] = useState<string>("");
  const [orgSettings, setOrgSettings] = useState<{ name?: string; address?: string; logo?: string; enquiryPhone?: string; contactPhone?: string; email?: string; website?: string }>({});
  const [showKeyImages, setShowKeyImages] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isTitleManual, setIsTitleManual] = useState(false);
  const [priors, setPriors] = useState<PriorStudy[]>([]);
  const [loadingPriors, setLoadingPriors] = useState(false);
  const [selectedPriorReport, setSelectedPriorReport] = useState<{ title: string; content: string } | null>(null);
  const [fetchingPriorReport, setFetchingPriorReport] = useState(false);
  const [modalities, setModalities] = useState<any[]>([]);
  const [dict, setDict] = useState<any>(null);
  const [isLockedMic, setIsLockedMic] = useState(false);
  const { state: dictState, start: startDict, stop: stopDict } = useDictation();
  const [voiceNotes, setVoiceNotes] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"context" | "notes" | "ai">("ai");
  const [showSideViewer, setShowSideViewer] = useState(!hideViewer);
  const [viewerWidth, setViewerWidth] = useState(40); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  // Load dictation dictionary & Modalities
  const safeAxios = useCallback(async (fn: () => Promise<any>, fallback?: any) => {
    try {
      return await fn();
    } catch (err) {
      console.warn("API Error:", err);
      return fallback;
    }
  }, []);

  useEffect(() => {
    fetch('/radiology_dictionary.json')
      .then(res => res.json())
      .then(data => setDict(data))
      .catch(err => console.error("Failed to load dictation dictionary:", err));

    safeAxios(async () => {
      const { data } = await axiosInstance.get("/modalities");
      setModalities(data?.data || []);
    });
  }, [safeAxios]);

  const normalizePatient = useCallback((raw: any): PatientMeta => {
    const data = raw || {};
    const cleanMod = (val: any) => {
      if (!val) return "";
      const s = String(val).trim();
      if (/^[-_.]+$/.test(s)) return "";
      if (["undefined", "null", "pending", "unknown"].includes(s.toLowerCase())) return "";
      return s;
    };
    return {
      patientName: cleanMod(data.patientName || data.patient_name || data.PatientName),
      patientID: cleanMod(data.patientID || data.patient_id || data.PatientID),
      modality: cleanMod(data.modality || data.Modality || (Array.isArray(data.ModalitiesInStudy) ? data.ModalitiesInStudy[0] : data.ModalitiesInStudy)),
      accessionNumber: cleanMod(data.accessionNumber || data.accession_number || data.AccessionNumber),
      studyDate: cleanMod(data.studyDate || data.study_date || data.StudyDate),
      patientSex: cleanMod(data.patientSex || data.patient_sex || data.PatientSex),
      patientAge: cleanMod(data.patientAge || data.patient_age || data.PatientAge),
      referringPhysician: cleanMod(data.referringPhysician || data.referring_physician || data.ReferringPhysicianName),
      bodyPart: cleanMod(data.bodyPart || data.body_part || data.BodyPartExamined),
    };
  }, []);

  const loadPriors = useCallback(async () => {
    if (!patient?.patientID) return;
    setLoadingPriors(true);
    await safeAxios(async () => {
      const r = await axiosInstance.get(`/studies/patient/${patient.patientID}/priors?exclude=${studyUID}`);
      if (r.data?.success) setPriors(r.data.data);
    });
    setLoadingPriors(false);
  }, [patient?.patientID, studyUID, safeAxios]);

  const loadAiContext = useCallback(async () => {
    if (!studyUID) return;
    setLoadingAiContext(true);
    await safeAxios(async () => {
      const r = await axiosInstance.get(`/ai/study-context/${studyUID}`);
      if (r.data?.success) setAiContext(r.data.data);
    });
    setLoadingAiContext(false);
  }, [studyUID, safeAxios]);

  useEffect(() => { 
    loadPriors(); 
    loadAiContext();
  }, [loadPriors, loadAiContext]);

  const viewPriorReport = async (uid: string, title: string) => {
    setFetchingPriorReport(true);
    await safeAxios(async () => {
      const r = await axiosInstance.get(`/reports/${encodeURIComponent(uid)}`);
      if (r.data?.success && r.data.data) {
        setSelectedPriorReport({ title, content: r.data.data.content });
      } else {
        alert("No report found for this prior study.");
      }
    });
    setFetchingPriorReport(false);
  };

  const getModalityColor = (modalityName?: string) => {
    const mod = (modalityName || "").toUpperCase();
    const settingColor = modalities.find(m => m.name.toUpperCase() === mod || m.ae_title.toUpperCase() === mod)?.color;
    if (settingColor) return settingColor;
    if (mod.includes("CT")) return "#f59e0b";
    if (mod.includes("MR")) return "#3b82f6";
    if (mod.includes("US")) return "#a855f7";
    if (mod.includes("XR") || mod.includes("CR") || mod.includes("DX")) return "#64748b";
    return "#94a3b8";
  };

  const calculatedTitle = useMemo(() => {
    if (isTitleManual && customTitle) return customTitle;
    const parts = [];
    if (patient?.modality) parts.push(patient.modality);
    if (patient?.bodyPart && !patient.bodyPart.includes("(")) parts.push(patient.bodyPart);
    parts.push("RADIOLOGY REPORT");
    return parts.join(" ");
  }, [patient?.modality, patient?.bodyPart, isTitleManual, customTitle]);

  useEffect(() => {
    if (!isTitleManual) setCustomTitle(calculatedTitle);
  }, [calculatedTitle, isTitleManual]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type report content here..." }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, FontFamily, Color,
      Highlight.configure({ multicolor: true }),
      Highlight.configure({ multicolor: true }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      SlashCommand,
      Figure, Figcaption,
      // Custom Extension to clean up empty figures
      Extension.create({
        name: 'figureCleanup',
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: new PluginKey('figureCleanup'),
              appendTransaction: (transactions, oldState, newState) => {
                const tr = newState.tr;
                let modified = false;
                // Iterate through docs to find empty figures
                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'figure') {
                    const hasImage = node.childCount > 0 && node.firstChild?.type.name === 'image';
                    if (!hasImage) {
                      // If no image (first child missing or not image), delete the whole figure
                      tr.delete(pos, pos + node.nodeSize);
                      modified = true;
                    }
                  }
                });
                return modified ? tr : null;
              },
            }),
          ];
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "print-content focus:outline-none min-h-[300px] prose max-w-none text-slate-800 leading-relaxed font-sans",
        'data-modality': patient?.modality || "",
      },
    },
  });

  useEffect(() => {
    if (!editor || !studyUID) return;
    const handler = ({ editor: e }: { editor: any }) => {
      localStorage.setItem(`report_draft_${studyUID}`, e.getHTML());
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor, studyUID]);

  useEffect(() => {
    if (editor && patient?.modality) {
      editor.setOptions({
        editorProps: {
          attributes: {
            ...editor.options.editorProps.attributes,
            'data-modality': patient.modality,
          }
        }
      });
    }
  }, [editor, patient?.modality]);

  const loadIdRef = useRef(0);

  useEffect(() => {
    if (!studyUID) return;
    const currentRequestId = ++loadIdRef.current;
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      // Emergency Timeout: Ensure loading spinner disappears after 7 seconds regardless of API success
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 7000);

      if (editor) editor.commands.setContent("");
      setStatus("draft"); setKeyImages([]); setReportContent(null);
      setPatient(null); setCustomTitle(""); setIsTitleManual(false);
      setWorkflowNote(""); setClinicalHistory(""); setVoiceNotes("");

      try {
        let reportData: any = null;
        let dbMeta: any = {};
        await safeAxios(async () => {
          const r = await axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`);
          if (ignore || currentRequestId !== loadIdRef.current) return;
          if (r.data?.success && r.data.data) {
            reportData = r.data.data;
            setStatus(reportData.status || "draft");
            if (reportData.reportTitle) { setCustomTitle(reportData.reportTitle); setIsTitleManual(true); }
            if (reportData.content) {
              setReportContent(reportData.content);
              if (reportData.workflowNote) setWorkflowNote(reportData.workflowNote);
            }
          }
        });
        if (ignore || currentRequestId !== loadIdRef.current) return;

        let clinicalData: any = null;
        await safeAxios(async () => {
          const r = await axiosInstance.get(`/studies/${studyUID}/meta`);
          if (!ignore && currentRequestId === loadIdRef.current && r.data?.success) {
            dbMeta = normalizePatient(r.data.data);
            if (r.data.data.clinical) clinicalData = r.data.data.clinical;
          }
        });

        let pacsMeta: any = {};
        await safeAxios(async () => {
          const r = await axiosInstance.get(`/studies/${studyUID}/dicom-tags`);
          if (!ignore && currentRequestId === loadIdRef.current && r.data?.tags) pacsMeta = normalizePatient(r.data.tags);
        });

        const pick = (key: keyof PatientMeta) => {
          const rVal = reportData ? reportData[key] : null;
          if (rVal && rVal.trim() !== "") return rVal;
          const dbVal = dbMeta ? dbMeta[key] : null;
          if (dbVal && dbVal.trim() !== "") return dbVal;
          return pacsMeta ? pacsMeta[key] : "";
        };

        const merged: PatientMeta = {
          ...dbMeta,
          ...pacsMeta,
          ...(reportData || {}),
          patientName: pick('patientName'),
          patientID: pick('patientID'),
          accessionNumber: pick('accessionNumber'),
          modality: pick('modality'),
          studyDate: pick('studyDate'),
          patientAge: pick('patientAge'),
          patientSex: pick('patientSex'),
          referringPhysician: pick('referringPhysician'),
          bodyPart: pick('bodyPart'),
        };

        setPatient(merged);
        if (reportData?.content) setReportContent(reportData.content);
      } catch (err) {
        console.error("LoadData fatal error", err);
      } finally {
        clearTimeout(timeoutId);
        if (!ignore && currentRequestId === loadIdRef.current) setLoading(false);
      }
    };

    safeAxios(async () => {
      const r = await axiosInstance.get("/settings");
      if (!ignore && currentRequestId === loadIdRef.current && r.data?.data?.org) setOrgSettings(r.data.data.org);
    });

    loadData();
    return () => { ignore = true; };
  }, [studyUID, editor, safeAxios, normalizePatient]);

  useEffect(() => {
    if (editor && reportContent !== null) editor.commands.setContent(reportContent);
  }, [editor, reportContent]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    let d = dateStr;
    if (d.includes("T")) d = d.split("T")[0];
    if (d.includes("-")) {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
    return d;
  };

  useEffect(() => {
    if (patient?.studyDate && !patient.studyDate.includes("-") && !patient.studyDate.includes("/")) {
      setPatient(p => p ? ({ ...p, studyDate: formatDate(p.studyDate) }) : null);
    }
  }, [patient?.studyDate]);

  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-GB'));
  const header = useMemo(() => ({ reportDate }), [reportDate]);

  const loadKeyImages = async () => {
    const r = await safeAxios(() => axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}/keyimages`));
    setKeyImages(r?.data?.data || []);
  };
  useEffect(() => { if (studyUID) loadKeyImages(); }, [studyUID]);

  const uploadKeyImage = async (file: File) => {
    const fd = new FormData(); fd.append("image", file);
    await safeAxios(async () => {
      await axiosInstance.post(`/reports/${encodeURIComponent(studyUID)}/keyimage/upload`, fd);
      loadKeyImages();
    });
  };

  const deleteKeyImage = async (id: string) => {
    // Immediate delete without confirmation for speed - user request
    await safeAxios(() => axiosInstance.delete(`/reports/keyimage/${id}`));
    loadKeyImages();
  };

  const insertKeyImageToEditor = (img: KeyImage) => {
    // 4 images per row = approx 23-24% width, considering margins
    // Gold Standard: 4 images per row using inline-flex tiles
    // Compact HTML string to prevent schema validation issues with whitespace
    const content = `<figure class="report-grid-figure"><img src="/api/uploads/keyimages/${img.file_path}" /><figcaption>Caption</figcaption></figure>`;


    // Note: The &nbsp; helps separate inline-blocks if the editor compresses whitespace
    editor?.chain().focus().insertContent(content).run();

    // Auto-remove (move) from panel after inserting - Gold Standard Workflow
    setKeyImages(prev => prev.filter(i => i.id !== img.id));
    // Ideally we might want to keep it on server but hide it, but user asked for "remove". 
    // If they want to get it back, they re-upload. Or we just hide it locally. 
    // Let's hide it locally for speed, but better to keep server in sync if they reload.
    // Calling delete is destructive but matches "Remove from panel".
    // Alternatively just filter locally: setKeyImages(prev => prev.filter(k => k.id !== img.id));
  };

  const handlePrint = () => {
    const originalTitle = document.title;

    // Medical Grade Naming: PATIENT_NAME_ACCESSION_DATE
    const clean = (s?: string) => (s || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const pName = clean(patient?.patientName);
    const acc = clean(patient?.accessionNumber);
    // Format date as YYYYMMDD for sorting if possible, or just clean the string
    let dateStr = clean(patient?.studyDate);

    // Attempt standard medical filename format
    const filename = `${pName}_${acc}_${dateStr}_REPORT`;

    document.title = filename;
    window.print();

    // Restore title after print dialog opens (timeout ensures browser picks up new title)
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Helper to generate PDF Blob
  const generatePdfBlob = async () => {
    const element = document.querySelector('.printable-area') as HTMLElement;
    if (!element) return null;

    // 1. Temporarily strip layout transforms that confuse html2canvas
    const originalTransform = element.style.transform;
    const originalClass = element.className; // Save tailwind classes

    // Remove scaling classes temporarily to ensure 1:1 capture without offsets
    element.classList.remove('scale-[0.9]', 'md:scale-100', 'transform', 'origin-top');

    // CRITICAL FIX: Force "Print View" mode so html2canvas sees TEXT blocks instead of Inputs
    element.classList.add('force-print-view');

    element.style.transform = 'none'; // Force reset
    element.style.margin = '0 auto';  // Center
    element.style.backgroundColor = '#ffffff'; // Ensure white background

    const opt = {
      margin: [5, 10, 10, 10], // Top, Right, Bottom, Left (Avoid header overlap)
      filename: 'report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        // Improved: Safely ignore UI elements
        ignoreElements: (el: Element) => {
          return el && el.classList && el.classList.contains('no-print');
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      return pdfBlob;
    } finally {
      // 2. Restore original UI state
      element.className = originalClass;
      element.style.transform = originalTransform;
      element.style.margin = '';
      element.style.backgroundColor = '';
      // Class removal handled by restoring originalClass, but extra safety:
      element.classList.remove('force-print-view');
    }
  };

  const handleSendToPacs = async () => {
    if (!studyUID || !patient) return;
    alert("Exporting to PACS...");

    try {
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error("Could not generate PDF");

      const fd = new FormData();
      fd.append("pdf", pdfBlob, "report.pdf");
      fd.append("metadata", JSON.stringify({
        PatientName: patient.patientName,
        PatientID: patient.patientID,
        AccessionNumber: patient.accessionNumber,
        StudyDate: patient.studyDate,
        Modality: patient.modality
      }));

      await axiosInstance.post('/dicom/export-pdf', fd);
      alert("Successfully sent to PACS!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to send to PACS: " + (err.response?.data?.message || err.message));
    }
  };

  const handleShareReport = async (type: 'email' | 'sms' | 'whatsapp') => {
    const promptLabel = type === 'email' ? 'Email' : (type === 'sms' ? 'Mobile Number' : 'WhatsApp Number');
    const recipient = prompt(`Enter Patient ${promptLabel}:`);
    if (!recipient) return;

    alert(`Sending ${type === 'email' ? 'Email' : (type === 'sms' ? 'SMS' : 'WhatsApp')}...`);

    try {
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error("Could not generate PDF");

      const fd = new FormData();
      fd.append("pdf", pdfBlob, "report.pdf");
      fd.append("type", type);
      fd.append("recipient", recipient);

      // Pass Metadata for Professional Email/SMS Content
      if (patient) {
        fd.append("metadata", JSON.stringify({
          patientName: patient.patientName,
          accessionNumber: patient.accessionNumber,
          studyDate: patient.studyDate ? new Date(patient.studyDate).toDateString() : 'N/A',
          hospitalName: orgSettings.name || "MERCURY HOSPITALS"
        }));
      }

      const response = await axiosInstance.post('/notify/report-ready', {
        patientId: patient?.patientID,
        type: type,
        recipient: recipient,
        patient: {
          first_name: patient?.patientName?.split(' ')[0],
          phone: recipient,
          dob: patient?.patientAge // Using age as mock DOB for OTP
        },
        reportData: {
          id: studyUID,
          modality: patient?.modality
        }
      });

      if (response.data) {
        toast.success(`${type.toUpperCase()} notification queued via Production Gateway.`);
      }

    } catch (err: any) {
      console.error(err);
      alert("Failed to share report: " + (err.response?.data?.message || err.message));
    }
  };


  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user for disclaimer
  useEffect(() => {
    // Assuming we can get user info from context or local storage if not available easily here
    // For now purely relying on RBAC context if accessible, or decoding token
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch (e) { }
    }
  }, []);

  const handleSmartInsert = useCallback(() => {
    if (!patient?.clinical) {
      toast.error("No clinical context (Patient is not marked Pregnancy/KUB)");
      return;
    }
    const html = generateSmartContent(patient.clinical, patient.modality, patient.bodyPart);
    if (html && editor) {
      editor.commands.insertContent(html);
      toast.success("Smart Table Inserted");
    } else {
      toast.error("No smart template matched for this patient type");
    }
  }, [patient, editor]);

  const handleSave = async (statusOverride?: string) => {
    if (!editor) return;

    const finalStatus = statusOverride || status;

    if (finalStatus === 'final' && !disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }

    const html = editor.getHTML();

    // PNDT Compliance Check for Indian Segment
    const isPndtRequired = (patient?.modality === 'USG' || patient?.clinical?.isPregnant) && patient?.patientSex === 'F';

    try {
      setIsSaving(true);
      if (finalStatus === 'final' && isPndtRequired) {
        const confirmed = confirm("PCPNDT ALERT: This is a prenatal diagnostic procedure. Form F is MANDATORY. Do you want to fill and sign Form F now?");
        if (!confirmed) {
          toast.error("PCPNDT Violation: Report cannot be finalized without signed Form F.");
          setIsSaving(false);
          return;
        }
        toast.success("Form F Signature Captured (Simulation)");
      }
      await axiosInstance.post("/reports/save", {
        studyUID: studyUID, // Assuming studyUID is the correct variable name
        content: html,
        workflow_status: finalStatus,
        patientName: patient?.patientName, // Assuming patient is the correct variable name
        patientID: patient?.patientID,
        modality: patient?.modality,
        accessionNumber: patient?.accessionNumber,
        studyDate: patient?.studyDate,
        reportTitle: customTitle, // Assuming customTitle is the correct variable name
        workflowNote: workflowNote,
      });

      if (finalStatus === "final") {
        await axiosInstance.post("/reports/finalize", {
          studyUID: studyUID,
          content: html,
          disclaimer_accepted: true
        });
        // Industry Standard: Auto-Push to PACS upon finalization
        // We run this without awaiting to not block the UI, or await if we want to ensure it sent
        // ideally we await it but don't fail report saving if it fails (just warn)
        handleSendToPacs().catch(e => console.error("Auto-Push PACS failed", e));
        toast.success("Report FINALIZED and DIGITALLY SIGNED.");
        // Reload to show signature
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.success("Draft saved.");
      }

      setStatus(finalStatus);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  // RESIZE LOGIC
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 70) setViewerWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);



  // DICTATION LOGIC - Refined with WebSocket Binary Streaming
  useEffect(() => {
    if (dictState.final) {
      let text = dictState.final.trim();
      if (text) {
        // Formatting: Upper case first letter and add period if missing
        text = text.charAt(0).toUpperCase() + text.slice(1);
        if (!/[.!?]$/.test(text)) text += ".";

        if (activeTab === "notes") {
          setVoiceNotes(prev => prev + (prev ? " " : "") + text);
        } else {
          editor?.chain().focus().insertContent(text + " ").run();
        }
      }
    }
  }, [dictState.final, activeTab, editor]);

  const toggleDictation = () => {
    if (dictState.listening) {
      stopDict();
    } else {
      startDict();
    }
  };

  const insertSymbol = (symbol: string) => { editor?.chain().focus().insertContent(symbol).run(); };
  const insertCriticalFlag = () => { editor?.chain().focus().insertContent('<div class="critical-finding-alert">⚠️ CRITICAL FINDING: </div>').run(); };
  const insertMeasurementTable = () => { editor?.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(); };

  const [viewerType, setViewerType] = useState<"compact" | "ohif">("ohif");

  const handleViewerCapture = (img: string) => {
    editor?.chain().focus().insertContent([
      { type: 'paragraph', content: [{ type: 'text', text: ' ' }] },
      {
        type: 'figure', content: [
          { type: 'image', attrs: { src: img, class: 'captured-finding' } },
          { type: 'figcaption', content: [{ type: 'text', text: 'Captured clinical finding' }] }
        ]
      },
      { type: 'paragraph', content: [{ type: 'text', text: ' ' }] }
    ]).run();
    toast.success("Finding captured into report");
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* PROFESSIONAL DIAGNOSTIC HEADER */}
      {!hideViewer && !params.studyId?.includes("inline") && (
        <div className="h-14 bg-[#0a0a0b] text-white flex items-center justify-between px-6 z-50 shadow-2xl no-print border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg rotate-3">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Diagnostic Workspace</span>
              <h2 className="text-sm font-bold tracking-tight text-white/90 leading-tight">Advanced Reporting Protocol</h2>
            </div>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patient Identity</span>
              <span className="text-xs font-bold text-white truncate max-w-[200px]">{patient?.patientName || "Loading Sequence..."}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">AI Analytics</span>
              <div className="flex gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-2.5 h-1 rounded-full bg-blue-500/30" />)}
              </div>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">System Active</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Engine v9.4.1</span>
              </div>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-all border border-white/5">
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPACT INTERACTIVE TOOLBAR (Replaces Sidebar) */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 no-print shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200">
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-7 w-8 p-0 rounded-md", editor.isActive('bold') ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}><Bold size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-7 w-8 p-0 rounded-md", editor.isActive('italic') ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}><Italic size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("h-7 w-8 p-0 rounded-md", editor.isActive('underline') ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}><UnderlineIcon size={14} /></Button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-1 group">
            <Button variant="outline" size="sm" onClick={toggleDictation} className={cn("h-8 px-3 gap-2 border-slate-200 rounded-lg transition-all", dictState.listening ? "bg-red-50 border-red-500 text-red-600 ring-2 ring-red-500/10" : "bg-white text-slate-600")}>
              <div className={cn("w-2 h-2 rounded-full", dictState.listening ? "bg-red-500 animate-pulse" : "bg-slate-300")} />
              <span className="text-[10px] font-black uppercase tracking-widest">{dictState.listening ? 'Mic Active' : 'Dictate'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsLockedMic(!isLockedMic)} className={cn("h-7 w-7 rounded-md transition-all", isLockedMic ? "text-red-600 bg-red-50" : "text-slate-300")}>
              {isLockedMic ? <Lock size={12} /> : <Unlock size={12} />}
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <SmartTemplateSelector modality={patient?.modality} bodyPart={patient?.bodyPart} gender={patient?.patientSex} onSelect={(html) => editor.commands.setContent(html)} />

          <div className="hidden lg:flex items-center gap-1 ml-2">
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("h-7 w-8 p-0", editor.isActive({ textAlign: 'left' }) ? "text-blue-600" : "text-slate-400")}><AlignLeft size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("h-7 w-8 p-0", editor.isActive({ textAlign: 'center' }) ? "text-blue-600" : "text-slate-400")}><AlignCenter size={14} /></Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowSideViewer(true); setShowWorkflowPanel(true); }}
              className={cn(
                "h-7 px-3 text-[10px] font-black gap-2 rounded-md transition-all uppercase tracking-widest",
                showSideViewer ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
              )}
            >
              <Columns size={14} />
              <span className="hidden xl:inline">Split View</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowSideViewer(false); setShowWorkflowPanel(false); }}
              className={cn(
                "h-7 px-3 text-[10px] font-black gap-2 rounded-md transition-all uppercase tracking-widest",
                !showSideViewer ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
              )}
            >
              <Maximize2 size={14} />
              <span className="hidden xl:inline">Full Page</span>
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setShowWorkflowPanel(!showWorkflowPanel)} className={cn("h-8 px-3 text-[10px] font-black gap-2 rounded-lg transition-all uppercase tracking-widest", showWorkflowPanel ? "bg-slate-100 text-slate-900" : "text-slate-400")}>
            <History className="w-3.5 h-3.5" />
            <span>HUB</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCritical(!isCritical)}
            className={cn(
              "h-8 px-3 text-[10px] font-black gap-2 rounded-lg transition-all uppercase tracking-widest",
              isCritical ? "bg-red-50 text-red-600 ring-2 ring-red-500/20" : "text-slate-400"
            )}
          >
            <AlertTriangle className={cn("w-3.5 h-3.5", isCritical && "animate-pulse")} />
            <span>{isCritical ? "CRITICAL FINDING" : "Routine"}</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <Button variant="default" size="sm" onClick={handlePrint} className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 text-[10px] font-black uppercase tracking-widest shadow-md border-b-2 border-blue-800"><Printer size={14} /> Print Protocol</Button>
        </div>
      </div>

      {/* DIAGNOSTIC HUD: Permanent Patient Identity & Context (Industry Standard) */}
      {!params.studyId?.includes("inline") && (
        <div className="h-10 bg-slate-900 text-white flex items-center px-6 gap-8 shrink-0 border-b border-white/5 shadow-inner no-print">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Patient</span>
            <span className="text-xs font-bold truncate">{patient?.patientName || "—"}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-400">{patient?.patientSex || "U"}/{patient?.patientAge || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ID</span>
            <span className="text-xs font-mono text-blue-400">{patient?.patientID || "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Accession</span>
            <span className="text-xs font-mono text-slate-300">{patient?.accessionNumber || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Study</span>
            <span className="text-xs font-bold text-emerald-400">{patient?.modality || "—"}</span>
            <span className="text-xs text-slate-400">• {patient?.studyDate || "—"}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {patient?.clinical?.abha_id && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                <Globe size={10} /> ABHA Active
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-black text-blue-400 uppercase tracking-widest">
              <Server size={10} /> ABDM Ready
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-slate-100/30">
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* LEFT: VIEWER */}
            {showSideViewer && (
              <>
                <div className="h-full bg-black flex flex-col relative" style={{ width: `${viewerWidth}%` }}>
                  {viewerType === "ohif" ? (
                    <iframe
                      title="Viewer"
                      src={`${(import.meta as any).env.VITE_ORTHANC_URL || `http://${window.location.hostname}:8042`}/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(studyUID || "")}`}
                      className="w-full h-full border-0"
                      allow="clipboard-read; clipboard-write"
                    />
                  ) : (
                    <CompactDicomViewer studyUID={studyUID || ""} patientData={patient} onCapture={handleViewerCapture} />
                  )}
                  <div className="absolute top-4 left-4 flex bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10 z-30">
                    <button onClick={() => setViewerType("ohif")} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", viewerType === "ohif" ? "bg-blue-600 text-white" : "text-white/40")}>OHIF</button>
                    <button onClick={() => setViewerType("compact")} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", viewerType === "compact" ? "bg-blue-600 text-white" : "text-white/40")}>QUICK</button>
                    <button onClick={() => { const f = document.querySelector('iframe[title="Viewer"]'); if (f) (f as any).src = (f as any).src; }} className="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white ml-1 border-l border-white/10"><RefreshCcw size={10} /></button>
                  </div>
                </div>
                <div ref={splitterRef} onMouseDown={startResizing} className="w-1 h-full bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-all z-20 group" />
              </>
            )}

            {/* MAIN REPORT CANVAS */}
            <div className="flex-1 overflow-auto p-4 md:p-12 flex justify-center custom-scrollbar bg-slate-100/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-6 py-20">
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin shadow-xl" />
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">Synchronizing Data</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Medical Intelligence Engine v9.4</span>
                  </div>
                </div>
              ) : (
                <div className="printable-area shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all animate-in fade-in zoom-in-95 duration-700">
                  <table className="w-full main-table">
                    <thead className="print-header-group">
                      <tr>
                        <td className="w-full">
                          {/* MEDICAL HEADER - PREMIUM COMPACT LAYOUT */}
                          <div className="medical-header flex flex-col items-center mb-0 pb-0 border-b-2 border-double border-slate-800">
                            <div className="flex w-full items-center justify-between px-4 mb-0">
                              {/* Logo */}
                              <div className="w-14 h-14 flex items-center justify-center text-slate-800">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                              </div>

                              <div className="flex-1 flex flex-col items-center pt-0">
                                {/* LINE 1: Hospital Name (22px Screen / 22pt Print) */}
                                <input
                                  className="no-print field-input-reset hospital-name text-center w-full bg-transparent placeholder-slate-300 focus:placeholder-transparent text-[22px] font-black uppercase tracking-[0.15em] font-serif-premium leading-none text-slate-900"
                                  value={orgSettings.name || ""}
                                  onChange={e => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="HOSPITAL NAME"
                                  style={{ fontSize: '22px', lineHeight: '1.1' }}
                                />
                                <div className="only-print print-header-name text-center text-[22pt] font-black uppercase tracking-[0.15em] font-serif-premium leading-none text-slate-900">
                                  {orgSettings.name || "HOSPITAL NAME"}
                                </div>

                                {/* REMOVED DIVIDER LINE AS REQUESTED */}
                                <div className="mt-1 mb-1"></div>

                                {/* LINE 2: Address (Compact) */}
                                <input
                                  className="no-print field-input-reset hospital-address text-center w-full bg-transparent placeholder-slate-300 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans leading-tight"
                                  value={orgSettings.address || ""}
                                  onChange={e => setOrgSettings(prev => ({ ...prev, address: e.target.value }))}
                                  placeholder="Hospital Address Line 1, City, State, Zip"
                                />
                                <div className="only-print print-header-address text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans leading-tight">
                                  {orgSettings.address || "HOSPITAL ADDRESS, CITY, STATE, ZIP"}
                                </div>

                                {/* LINE 3: Icons Only + Data (Compact) */}
                                <div className="flex justify-center items-center gap-4 mt-1 text-[9px] text-slate-600 font-medium uppercase tracking-wide font-sans">

                                  {/* Enquiry - Blue Phone */}
                                  <div className="flex items-center gap-1 group">
                                    <Phone className="w-2.5 h-2.5 text-blue-600 fill-blue-600" />
                                    <input className="no-print grid-input w-20 text-center text-[10px]" value={orgSettings.enquiryPhone || ""} onChange={e => setOrgSettings(prev => ({ ...prev, enquiryPhone: e.target.value }))} placeholder="Enquiry" />
                                    <span className="only-print print-header-meta text-slate-800 font-semibold">{orgSettings.enquiryPhone || "98888 88888"}</span>
                                  </div>

                                  {/* Emergency/Admin - Red Siren/Alert */}
                                  <div className="flex items-center gap-1 group">
                                    <Siren className="w-2.5 h-2.5 text-red-500" />
                                    <input className="no-print grid-input w-20 text-center text-[10px]" value={orgSettings.contactPhone || ""} onChange={e => setOrgSettings(prev => ({ ...prev, contactPhone: e.target.value }))} placeholder="Emergency" />
                                    <span className="only-print print-header-meta text-slate-800 font-semibold">{orgSettings.contactPhone || "99999 99999"}</span>
                                  </div>

                                  {/* Email - Teal Mail */}
                                  <div className="flex items-center gap-1 group">
                                    <Mail className="w-2.5 h-2.5 text-teal-600" />
                                    <input className="no-print grid-input w-36 text-center lowercase text-[10px]" value={orgSettings.email || ""} onChange={e => setOrgSettings(prev => ({ ...prev, email: e.target.value }))} placeholder="email" />
                                    <span className="only-print print-header-meta lowercase text-slate-600 font-medium">{orgSettings.email || "info@hospital.com"}</span>
                                  </div>

                                  {/* Website - Indigo Globe */}
                                  <div className="flex items-center gap-1 group">
                                    <Globe className="w-2.5 h-2.5 text-indigo-600" />
                                    <input className="no-print grid-input w-36 text-center lowercase text-[10px]" value={orgSettings.website || ""} onChange={e => setOrgSettings(prev => ({ ...prev, website: e.target.value }))} placeholder="website" />
                                    <span className="only-print print-header-meta lowercase text-slate-600 font-medium">{orgSettings.website || "www.hospital.com"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Logo Spacer (Right) */}
                            <div className="w-16" />
                          </div>

                          {/* PATIENT INFO GRID - COMPACT SPACER */}
                          <div className="border-2 border-slate-800 mb-6 rounded-sm overflow-hidden bg-white relative z-10">
                            {/* ROW 1: Name (Dominant) | Age/Sex | ID */}
                            <div className="flex border-b border-slate-300">
                              <div className="flex-[2] border-r border-slate-300 flex flex-col bg-slate-50/50">
                                <span className="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Patient Name</span>
                                <div className="flex-1 px-3 pb-1 flex items-center">
                                  <textarea
                                    rows={1}
                                    className="no-print w-full bg-transparent resize-none overflow-hidden font-bold uppercase text-slate-900 text-lg placeholder:text-slate-300 leading-tight font-serif-premium"
                                    value={patient?.patientName || ""}
                                    onChange={e => setPatient(p => ({ ...p!, patientName: e.target.value }))}
                                    placeholder="PATIENT NAME"
                                    onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                  />
                                  <div className="only-print font-bold uppercase text-slate-900 text-lg leading-tight font-serif-premium w-full text-left">
                                    {patient?.patientName || "PATIENT NAME"}
                                  </div>
                                </div>
                              </div>
                              <div className="w-28 border-r border-slate-300 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Age / Sex</span>
                                <div className="flex-1 px-2 pb-1 flex items-center gap-1 font-bold text-slate-800">
                                  {/* UI INPUTS */}
                                  <div className="flex items-center gap-1 no-print">
                                    <input className="w-8 bg-transparent text-center placeholder:text-slate-300" value={patient?.patientAge || ""} onChange={e => setPatient(p => ({ ...p!, patientAge: e.target.value }))} placeholder="00" />
                                    <span>/</span>
                                    <input className="w-8 bg-transparent text-center placeholder:text-slate-300" value={patient?.patientSex || ""} onChange={e => setPatient(p => ({ ...p!, patientSex: e.target.value }))} placeholder="M" />
                                  </div>
                                  {/* PRINT TEXT */}
                                  <div className="only-print w-full text-center">
                                    {patient?.patientAge || "--"} / {patient?.patientSex || "--"}
                                  </div>
                                </div>
                              </div>
                              <div className="w-36 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Patient ID</span>
                                <div className="flex-1 px-2 pb-1 flex items-center">
                                  <input className="no-print w-full bg-transparent font-bold text-slate-800 placeholder:text-slate-300" value={patient?.patientID || ""} onChange={e => setPatient(p => ({ ...p!, patientID: e.target.value }))} placeholder="ID" />
                                  <div className="only-print font-bold text-slate-800">{patient?.patientID || "---"}</div>
                                </div>
                              </div>
                            </div>

                            {/* ROW 2: Ref Dr (Wide) | Accession | Modality | Scan Date (Moved Here) */}
                            <div className="flex border-b border-slate-300">
                              <div className="flex-[2] border-r border-slate-300 flex flex-col bg-slate-50/50">
                                <span className="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ref. Physician</span>
                                <div className="flex-1 px-3 pb-1 flex items-center">
                                  <textarea
                                    rows={1}
                                    className="no-print w-full bg-transparent resize-none overflow-hidden font-bold uppercase text-slate-800 text-sm placeholder:text-slate-300 leading-tight"
                                    value={patient?.referringPhysician || ""}
                                    onChange={e => setPatient(p => ({ ...p!, referringPhysician: e.target.value }))}
                                    placeholder="DR. NAME"
                                    onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                  />
                                  <div className="only-print font-bold uppercase text-slate-800 text-sm leading-tight w-full text-left">
                                    {patient?.referringPhysician || "DR. ________________"}
                                  </div>
                                </div>
                              </div>
                              <div className="w-36 border-r border-slate-300 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Accession</span>
                                <div className="flex-1 px-2 pb-1 flex items-center">
                                  <input className="no-print w-full bg-transparent font-bold text-slate-800 placeholder:text-slate-300" value={patient?.accessionNumber || ""} onChange={e => setPatient(p => ({ ...p!, accessionNumber: e.target.value }))} placeholder="ACC" />
                                  <div className="only-print font-bold text-slate-800">{patient?.accessionNumber || "---"}</div>
                                </div>
                              </div>
                              <div className="w-20 border-r border-slate-300 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Modality</span>
                                <div className="flex-1 px-2 pb-1 flex items-center">
                                  <input className="no-print w-full bg-transparent font-bold text-blue-900 uppercase placeholder:text-slate-300" value={patient?.modality || ""} onChange={e => setPatient(p => ({ ...p!, modality: e.target.value }))} placeholder="MOD" />
                                  <div className="only-print font-bold text-black uppercase">{patient?.modality || "---"}</div>
                                </div>
                              </div>
                              <div className="w-32 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Scan Date</span>
                                <div className="flex-1 px-2 pb-1 flex items-center">
                                  <input className="no-print w-full bg-transparent font-bold text-slate-800 placeholder:text-slate-300" value={patient?.studyDate ? formatDate(patient.studyDate) : ""} onChange={e => setPatient(p => ({ ...p!, studyDate: e.target.value }))} placeholder="Date" />
                                  <div className="only-print font-bold text-slate-800">{patient?.studyDate ? formatDate(patient.studyDate) : "--/--/----"}</div>
                                </div>
                              </div>
                            </div>

                            {/* ROW 3: Examination (Full Width) | Report Date (Moved Here) */}
                            <div className="flex bg-slate-50/30">
                              <div className="flex-1 flex flex-col border-r border-slate-300">
                                <span className="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Examination / Study Description</span>
                                <div className="flex-1 px-3 pb-2 flex items-center">
                                  <textarea
                                    rows={1}
                                    className="no-print w-full bg-transparent resize-none overflow-hidden font-bold uppercase text-slate-900 text-sm placeholder:text-slate-300 leading-tight"
                                    value={patient?.bodyPart || ""}
                                    onChange={e => setPatient(p => ({ ...p!, bodyPart: e.target.value }))}
                                    placeholder="STUDY DESCRIPTION"
                                    onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                  />
                                  <div className="only-print font-bold uppercase text-slate-900 text-sm leading-tight w-full text-left">
                                    {patient?.bodyPart || "STUDY DESCRIPTION"}
                                  </div>
                                </div>
                              </div>
                              {/* Report Date Block */}
                              <div className="w-40 flex flex-col">
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">Report Date</span>
                                <div className="flex-1 px-2 pb-1 flex items-center">
                                  <input className="no-print w-full bg-transparent font-bold text-slate-800 placeholder:text-slate-300" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                                  <div className="only-print font-bold text-slate-800">{reportDate}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* REPORT TITLE */}
                          <div className="report-title-strip mb-8">
                            <input
                              className="field-input-reset report-title-text text-center w-full bg-transparent text-2xl font-black underline decoration-2 underline-offset-4"
                              value={customTitle}
                              onChange={(e) => { setCustomTitle(e.target.value); setIsTitleManual(true); }}
                            />
                          </div>

                          {/* Header Spacer to avoid content merge */}
                          <div className="h-4" />
                        </td>
                      </tr>
                    </thead>

                    {/* BODY - REPORT CONTENT */}
                    <tbody>
                      <tr>
                        <td className="report-body py-2 align-top">
                          <EditorContent editor={editor} className="min-h-[600px] print:min-h-0" />

                          {/* GOLD STANDARD: END OF REPORT MARKER */}
                          <div className="only-print w-full flex flex-col items-center justify-center mt-8 mb-4 opacity-50">
                            <div className="flex items-center gap-2">
                              <div className="h-px w-12 bg-slate-400"></div>
                              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">End of Report</span>
                              <div className="h-px w-12 bg-slate-400"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>

                    {/* FOOTER - CLEAN (Space reserved for page numbers only) */}
                    <tfoot>
                      <tr>
                        <td className="w-full">
                          <div className="h-8" /> {/* Spacer */}
                          {/* Empty footer container - Page numbers will appear here via CSS @bottom-right */}
                          <div className="only-print w-full border-t-0 p-0"></div>
                          <div className="h-4" /> {/* Bottom Padding */}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {
              showWorkflowPanel && (
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col no-print glass-panel animate-in slide-in-from-right duration-500 shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm"><Sigma size={16} className="text-white" /></div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Medical Hub</h2>
                    </div>
                    <button onClick={() => setShowWorkflowPanel(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                    <div className="flex bg-slate-100/50 p-1 rounded-xl">
                      <button onClick={() => setActiveTab("context")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'context' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                        <Info size={14} /> HISTORY
                      </button>
                      <button onClick={() => setActiveTab("notes")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                        <Mic size={14} /> VOICE
                      </button>
                      <button onClick={() => setActiveTab("ai")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'text-slate-400 hover:text-indigo-400'}`}>
                        <Server size={14} /> AI CONTEXT
                      </button>
                    </div>

                    {activeTab === "context" ? (
                      <>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Stethoscope size={14} />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">Clinical Context</span>
                          </div>
                          <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                            <textarea placeholder="No clinical history provided." value={clinicalHistory} onChange={(e) => setClinicalHistory(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 italic leading-relaxed placeholder:text-slate-300 resize-none h-20" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400">
                              <History size={14} />
                              <span className="text-[10px] font-extrabold uppercase tracking-widest">Priors Timeline</span>
                            </div>
                            <button onClick={loadPriors} className="text-slate-400 hover:text-blue-600"><RefreshCcw size={12} className={loadingPriors ? 'animate-spin' : ''} /></button>
                          </div>

                          <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 flex flex-col">
                            {priors.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic pl-8 py-2">No prior studies found.</div>
                            ) : (
                              priors.map((p) => (
                                <div key={p.studyUID} className="relative pl-8 group cursor-pointer" onClick={() => viewPriorReport(p.studyUID, p.description)}>
                                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 group-hover:border-blue-500 transition-colors">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getModalityColor(p.modality) }} />
                                  </div>
                                  <div className="flex flex-col p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{p.date} • {p.modality}</span>
                                    <span className="text-xs font-bold text-slate-700 leading-tight mt-1">{p.description}</span>
                                    {p.reportStatus === 'final' && <span className="text-[9px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"><Printer size={10} /> View Report <ChevronRight size={10} /></span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    ) : activeTab === "notes" ? (
                      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mic size={14} />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Voice Scribble Pad</span>
                        </div>
                        <div className="p-5 bg-blue-50/30 rounded-3xl border border-blue-100 ring-8 ring-blue-50/10 min-h-[300px] flex flex-col shadow-inner">
                          <textarea
                            placeholder="Speak freely to take rough notes... (Hands-free mode recommended)"
                            value={voiceNotes}
                            onChange={(e) => setVoiceNotes(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm text-blue-800 leading-relaxed placeholder:text-blue-200 resize-none flex-1 font-medium"
                          />
                          {voiceNotes && (
                            <Button
                              size="sm"
                              onClick={() => { editor?.chain().focus().insertContent(`<p><b>Note:</b> ${voiceNotes}</p>`).run(); setVoiceNotes(""); }}
                              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-bold tracking-widest rounded-xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                            >
                              Paste into Findings
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic px-2">This is a temporary pad. Notes are NOT saved to the permanent record unless pasted into the main editor.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-500">
                            <Server size={14} />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">AI Intelligence</span>
                          </div>
                          <button onClick={loadAiContext} className="text-indigo-400 hover:text-indigo-600">
                            <RefreshCcw size={12} className={loadingAiContext ? "animate-spin" : ""} />
                          </button>
                        </div>
                        
                        {loadingAiContext ? (
                           <div className="flex flex-col items-center justify-center py-10 opacity-50">
                             <Server className="w-8 h-8 text-indigo-300 animate-pulse mb-3" />
                             <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Analyzing Context...</span>
                           </div>
                        ) : !aiContext ? (
                           <div className="text-[10px] text-slate-400 italic py-4">No AI context was generated for this study.</div>
                        ) : (
                          <div className="space-y-4">
                            {/* ALERTS */}
                            {aiContext.abnormality_alerts && aiContext.abnormality_alerts.length > 5 && (
                              <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Alerts</h4>
                                <p className="text-xs text-red-800 font-medium leading-relaxed">{String(aiContext.abnormality_alerts).replace(/[[\]"]/g, '')}</p>
                              </div>
                            )}

                            {/* COMPARISON HINTS */}
                            {aiContext.comparison_hints && (
                              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1 flex items-center gap-1"><History size={10} /> Comparison Focus</h4>
                                <p className="text-xs text-indigo-900 leading-relaxed font-medium">{String(aiContext.comparison_hints).replace(/[[\]"]/g, '')}</p>
                              </div>
                            )}

                            {/* SUGGESTED FINDINGS */}
                            {aiContext.suggested_findings && (
                              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><MessageSquare size={10} /> Suggested Findings</h4>
                                <ul className="text-xs text-slate-700 leading-relaxed space-y-2 list-disc pl-4 marker:text-slate-300 font-medium pb-2 border-b border-slate-200/50 mb-3">
                                  {
                                    (typeof aiContext.suggested_findings === 'string' 
                                      ? aiContext.suggested_findings.split('\n') 
                                      : aiContext.suggested_findings).map((f: string, i: number) => {
                                        const cleanF = f.replace(/^- /, '').replace(/["[\]]/g, '').trim();
                                        return cleanF ? <li key={i}>{cleanF}</li> : null;
                                      })
                                  }
                                </ul>
                                <Button
                                  size="sm"
                                  onClick={() => { 
                                    const findingsHTML = (typeof aiContext.suggested_findings === 'string' 
                                    ? aiContext.suggested_findings.split('\n') 
                                    : aiContext.suggested_findings)
                                      .map((f: string) => f.replace(/^- /, '').replace(/["[\]]/g, '').trim())
                                      .filter((f: string) => !!f)
                                      .map((f: string) => `<li>${f}</li>`)
                                      .join("");
                                    editor?.chain().focus().insertContent(`<p><strong>AI Suggested Findings:</strong></p><ul>${findingsHTML}</ul>`).run(); 
                                  }}
                                  className="w-full bg-slate-900 hover:bg-black text-white text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all"
                                >
                                  Insert Findings
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Sigma size={14} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Workflow State</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {[
                          { id: 'draft', label: 'Draft', icon: Pencil, color: 'bg-amber-500' },
                          { id: 'preliminary', label: 'Preliminary', icon: Eye, color: 'bg-blue-500' },
                          { id: 'final', label: 'Finalized', icon: Lock, color: 'bg-emerald-500' },
                          { id: 'addendum', label: 'Addendum', icon: AlertTriangle, color: 'bg-red-500' },
                        ].map((s) => {
                          const isActive = status === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setStatus(s.id as WorkflowStatus)}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive
                                ? `${s.color} border-transparent shadow-lg shadow-${s.id}-500/20 scale-105 z-10`
                                : 'bg-white border-slate-100 hover:border-slate-300'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <s.icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
                              </div>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pb-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Pencil size={14} />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Clarification Note</span>
                        </div>
                      </div>
                      <textarea
                        placeholder="Enter findings clarification or addendum reason..."
                        value={workflowNote}
                        onChange={(e) => setWorkflowNote(e.target.value)}
                        className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-slate-300 text-slate-700 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">

                    <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <h4 className="text-[10px] font-bold uppercase text-amber-700 tracking-widest flex items-center gap-1"><Lock size={10} /> Legal Certification</h4>
                      <label className="flex items-start gap-2 text-[10px] text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={disclaimerAccepted}
                          onChange={e => setDisclaimerAccepted(e.target.checked)}
                          disabled={status === 'final'}
                        />
                        <span className="leading-tight">
                          I, <b>{currentUser?.full_name || "the undersigned"}</b>, hereby certify that I have personally reviewed the images and this report is an accurate interpretation of the findings. I affix my digital signature to this document.
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={isSaving || status === 'final'}
                        onClick={() => handleSave("draft")}
                        variant="outline"
                        className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        Save Draft
                      </Button>
                      <Button
                        disabled={isSaving || status === 'final'}
                        onClick={() => {
                          if (!disclaimerAccepted) setShowDisclaimer(true);
                          else handleSave("final");
                        }}
                        className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${disclaimerAccepted ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-slate-400 cursor-not-allowed'} `}
                      >
                        Sign & Finalize
                      </Button>
                    </div>


                    <button
                      onClick={() => setShowWorkflowPanel(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-tighter transition-colors"
                    >
                      Collapse Side Panel
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {
        selectedPriorReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Historical Findings</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedPriorReport.title}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPriorReport(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"><X size={16} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/10">
                <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedPriorReport.content) }} />
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                <Button onClick={() => setSelectedPriorReport(null)} className="bg-slate-900 text-white rounded-xl px-6 text-xs font-bold uppercase tracking-widest">Close Record</Button>
              </div>
            </div>
          </div>
        )
      }

      {
        (showKeyImages || keyImages.length > 0) && (
          <DraggablePanel
            title="Key Image Manager"
            subtitle={`${keyImages.length} Images`}
            onClose={() => setShowKeyImages(false)}
            className="w-[600px] h-auto max-h-[600px]"
          >
            <div className="p-4 bg-slate-50/50 flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
              {keyImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white h-full">
                  <ImagePlus size={32} className="mb-2 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-wide">No Key Images</span>
                  <span className="text-[10px]">Upload or drag images here</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {keyImages.map(img => (
                    <div key={img.id} className="group relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-slate-100 relative cursor-pointer" onClick={() => insertKeyImageToEditor(img)}>
                        <img src={`/api/uploads/keyimages/${img.file_path}`} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="bg-black/80 text-white text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm uppercase tracking-wider">Insert</span>
                        </div>
                      </div>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteKeyImage(img.id); }}
                          className="bg-white/90 text-red-500 p-1 rounded shadow-sm hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete Image"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <div className="p-1 border-t border-slate-50">
                        <p className="text-[9px] text-slate-500 truncate text-center font-mono">{img.uploaded_at ? new Date(img.uploaded_at).toLocaleTimeString() : "IMG"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-blue-200 border-dashed cursor-pointer transition-colors active:scale-[0.99] relative">
              <ImagePlus size={14} />
              <span>Upload New Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => {
                  if (e.target.files?.length) {
                    Array.from(e.target.files).forEach(file => uploadKeyImage(file));
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </DraggablePanel>
        )}

      {/* FINALIZE & SIGN DISCLAIMER MODAL */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg ring-4 ring-blue-600/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Finalize & Sign</h3>
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Medico-Legal Protocol v4.2</p>
              </div>
            </div>
            <div className="p-8">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6">
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  "I, being the authorized signatory, hereby confirm that I have personally reviewed the images for Study UID
                  <span className="font-mono text-blue-600 font-bold mx-1">{studyUID.slice(-8)}</span>
                  and the clinical history provided. I take full responsibility for the diagnostic accuracy of this report as per Indian Medical Council standards."
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-8 group cursor-pointer" onClick={() => setDisclaimerAccepted(true)}>
                <div className={cn("w-5 h-5 rounded border-2 border-emerald-500 flex items-center justify-center bg-white group-hover:scale-110 transition-all", disclaimerAccepted && "bg-emerald-500")}>
                  {disclaimerAccepted && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                </div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">I accept the medico-legal disclaimer</span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest border-slate-200" onClick={() => setShowDisclaimer(false)}>Cancel</Button>
                <Button
                  disabled={!disclaimerAccepted}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  onClick={() => { setShowDisclaimer(false); handleSave("final"); }}
                >
                  Confirm & Sign
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraggablePanel({ children, onClose, title = "Key Images", subtitle, className = "w-64" }: { children: React.ReactNode; onClose: () => void; title?: string; subtitle?: string; className?: string }) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 600, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y))
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
    <div className={`absolute z-[9000] flex flex-col bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 ${className}`} style={{ left: position.x, top: position.y }}>
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-move select-none active:bg-slate-100" onMouseDown={onMouseDown}>
        <div className="flex items-center gap-2 pointer-events-none">
          <ImagePlus size={16} className="text-blue-600" />
          <span className="text-xs font-black uppercase text-slate-700 tracking-widest">{title}</span>
          {subtitle && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{subtitle}</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-500" onClick={onClose}><X size={14} /></Button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

