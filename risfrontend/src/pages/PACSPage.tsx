// src/pages/PACSPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import axiosInstance from "../services/axiosInstance";

// import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

import {
  Loader2,
  Monitor,
  FileEdit,
  CalendarPlus,
  ClipboardList,
  RefreshCw,
  Columns,
  Maximize2,
  ChevronDown,
  Layout,
  Search,
  X
} from "lucide-react";

import dayjs from "dayjs";
import { cn } from "../lib/utils";
import { getModalityColors } from "../utils/modalityColors";

import ReportEditor from "./ReportEditor";
import AppointmentScheduler from "./Schedule/AppointmentScheduler";
import DateFilter from "../components/DateRangePicker";
import { ResizableLayout } from "../components/layout/ResizableLayout";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";

// ---------------- TYPES ----------------
type PACSServer = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  base_url?: string | null;
  aetitle?: string | null;
};

type StudyRow = {
  id: string;
  studyInstanceUID?: string;
  patientName?: string;
  patientID?: string;
  modality?: string;
  description?: string;
  date?: string;
  accessionNumber?: string;
  [k: string]: any;
};

// ------------- DICOM TAG UTIL -------------
const getDicomTag = (obj: any, tag: string) => {
  if (!obj || !obj[tag]) return "";
  const v = obj[tag].Value;
  if (!v || v.length === 0) return "";
  const first = v[0];
  if (typeof first === "object" && first.Alphabetic) return first.Alphabetic;
  return typeof first === "string" ? first : JSON.stringify(first);
};

// ------------- NORMALIZE STUDY -------------
const normalizeStudy = (s: any): StudyRow => {
  const patientName =
    (s.patient_name || s.patientName || s.PatientName || getDicomTag(s, "00100010") || "").replace(/\^/g, " ").trim();

  const patientID =
    s.patient_id || s.patientID || s.PatientID || getDicomTag(s, "00100020") || "";

  const studyUID =
    s.study_instance_uid ||
    s.studyInstanceUID ||
    s.StudyInstanceUID ||
    getDicomTag(s, "0020000D") ||
    s.id ||
    "";

  const accession =
    s.accession_number ||
    s.accessionNumber ||
    s.AccessionNumber ||
    getDicomTag(s, "00080050") ||
    "";

  let date = s.study_date || s.date || s.StudyDate || getDicomTag(s, "00080020") || "";
  // Check if date is Date object
  if (date instanceof Date) date = dayjs(date).format("YYYYMMDD");
  // normalize JS date string if needed
  if (typeof date === 'string' && date.includes('-')) date = date.replace(/-/g, '');

  if (/^\d{8}$/.test(date)) {
    date = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }

  // Robust Modality Extraction
  let modality = s.modality || s.Modality || getDicomTag(s, "00080060");

  if (!modality) {
    // Try generic 'ModalitiesInStudy' tag (0008,0061)
    const mis = s.ModalitiesInStudy || getDicomTag(s, "00080061");
    if (Array.isArray(mis) && mis.length > 0) modality = mis[0];
    else if (typeof mis === "string") modality = mis;
  }

  // Robust Body Part Extraction
  const bodyPart = s.body_part || s.bodyPart || s.BodyPartExamined || getDicomTag(s, "00180015") || "";

  // If still empty, check if '00081030' (Description) contains a hint? No, that's unsafe.
  // Fallback to "—" is handled in render

  // Robust Description Extraction
  const description =
    s.description ||
    s.StudyDescription ||
    s.studyDescription ||
    getDicomTag(s, "00081030") ||
    (s["00081030"] && s["00081030"].Value && s["00081030"].Value[0]) ||
    "";

  // Additional demographics for Report Header
  const sex = s.patientSex || s.PatientSex || s.sex || getDicomTag(s, "00100040") || "";
  const age = s.patientAge || s.PatientAge || s.age || getDicomTag(s, "00101010") || "";
  const refPhys = s.referringPhysician || s.ReferringPhysicianName || s.referring_physician || getDicomTag(s, "00080090") || "";

  return {
    id: studyUID || Math.random().toString(36).slice(2),
    studyInstanceUID: studyUID,
    patientName,
    patientID,
    modality: modality || "",
    date,
    studyDate: date, // Added studyDate alias to match PatientMeta
    accessionNumber: accession,
    description,
    bodyPart,
    patientSex: sex,
    patientAge: age,
    referringPhysician: refPhys,
    ...s,
  };
};

// ---------------- HELPER: Modality Color ----------------
// ---------------- HELPER: Modality Color ----------------
// Removed local helper in favor of shared utility


export default function PACSPage() {
  // servers + selection
  const [servers, setServers] = useState<PACSServer[]>([]);
  const [selected, setSelected] = useState<PACSServer | null>(null);

  // studies + loading
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{
    start: Date;
    end: Date;
  }>({
    start: dayjs().subtract(1, 'month').startOf("day").toDate(),
    end: dayjs().endOf("day").toDate(),
  });

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // split viewer/report
  const [splitMode, setSplitMode] = useState<"horizontal" | "vertical">("horizontal");
  const [splitView, setSplitView] = useState<{
    active: boolean;
    study?: StudyRow | null;
  }>({ active: false, study: null });

  // report status map
  const [reportStatusMap, setReportStatusMap] = useState<
    Record<string, { exists: boolean; status?: string }>
  >({});

  // appointment modal
  const [apptPrefill, setApptPrefill] = useState<any | null>(null);
  const [showApptModal, setShowApptModal] = useState(false);

  // ---------------- LOAD SERVERS ----------------
  const loadServers = useCallback(async () => {
    try {
      const r = await axiosInstance.get("/pacs");
      const list = r.data?.data ?? [];
      setServers(list);
      if (list.length) setSelected(prev => prev || list[0]);
    } catch (err) {
      console.error("loadServers", err);
      setServers([]);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // ---------------- FETCH STUDIES ----------------
  const fetchStudies = useCallback(
    async (srv?: PACSServer) => {
      const server = srv ?? selected;
      if (!server) return;

      setLoading(true);
      try {
        const startStr = dayjs(dateRange.start).format("YYYY-MM-DD");
        const endStr = dayjs(dateRange.end).format("YYYY-MM-DD");
        const r = await axiosInstance.get(`/pacs/${server.id}/studies`, {
          params: { startDate: startStr, endDate: endStr }
        });
        const list = r.data?.data ?? [];
        const normalized = (Array.isArray(list) ? list : []).map(normalizeStudy);

        // newest first
        normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        setStudies(normalized);
        setPage(1);

        // preload report statuses (first 50)
        const uids = normalized
          .map((s) => s.studyInstanceUID || s.id)
          .filter(Boolean)
          .slice(0, 50);

        if (uids.length) {
          const promises = uids.map((uid) =>
            axiosInstance
              .get(`/reports/status/${encodeURIComponent(uid)}`)
              .catch(() => null)
          );

          const results = await Promise.all(promises);
          const map: Record<string, { exists: boolean; status?: string }> = {};
          results.forEach((res, idx) => {
            const uid = uids[idx];
            if (res?.data?.success) {
              map[uid] = {
                exists: !!res.data.data?.exists,
                status: res.data.data?.status,
              };
            } else {
              map[uid] = { exists: false };
            }
          });
          setReportStatusMap((prev) => ({ ...prev, ...map }));
        }
      } catch (err: any) {
        console.error("fetchStudies", err);
        alert(
          err?.response?.data?.message ||
          `Failed to fetch studies from PACS "${server?.name}"`
        );
        setStudies([]);
      } finally {
        setLoading(false);
      }
    },
    [selected, dateRange]
  );

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  // ---------------- FILTERED STUDIES ----------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const startStr = dayjs(dateRange.start).format("YYYY-MM-DD");
    const endStr = dayjs(dateRange.end).format("YYYY-MM-DD");

    return studies.filter((s) => {
      const matchesQ =
        !q ||
        (s.patientName || "").toLowerCase().includes(q) ||
        (s.patientID || "").toLowerCase().includes(q) ||
        (s.modality || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.accessionNumber || "").toLowerCase().includes(q);

      const d = s.date || "";
      const inRange = !d || (d >= startStr && d <= endStr);

      return matchesQ && inRange;
    });
  }, [studies, search, dateRange]);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayed = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  // ---------------- ACTION HELPERS ----------------
  const openCreateAppointmentFromStudy = (study: StudyRow) => {
    setApptPrefill({
      patientId: study.patientID,
      patientName: study.patientName,
      modality: study.modality,
      accession: study.accessionNumber,
      studyUID: study.studyInstanceUID ?? study.id,
    });
    setShowApptModal(true);
  };

  const openMWLModal = (study: StudyRow) => {
    const pre = {
      pacs_id: selected?.id ?? null,
      patient_id: study.patientID,
      patient_name: study.patientName,
      accession_number: study.accessionNumber,
      study_instance_uid: study.studyInstanceUID ?? study.id,
      modality: study.modality,
      scheduled_datetime: dayjs().format("YYYY-MM-DDTHH:mm"),
    };
    sessionStorage.setItem("mwl_prefill", JSON.stringify(pre));
    window.location.href = "/mwl";
  };

  const openOHIF = (uid?: string) => {
    if (!uid) return;
    window.open(
      `http://${window.location.hostname}:8042/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(
        uid
      )}`,
      "_blank"
    );
  };

  const handleLaunchViewer = async (studyUID: string, viewerType: string, profile: string = 'desktop') => {
    try {
      const r = await axiosInstance.get(`/viewer/launch/${encodeURIComponent(studyUID)}`, {
        params: { viewerType, profile, pacsId: selected?.id }
      });
      const { launchUrl } = r.data.data;
      if (launchUrl) {
        // Handle protocol handlers vs regular URLs
        if (launchUrl.startsWith('weasis://') || launchUrl.startsWith('radiant://')) {
          window.location.href = launchUrl;
        } else {
          window.open(launchUrl, "_blank");
        }
      }
    } catch (err: any) {
      console.error("handleLaunchViewer", err);
      alert(err?.response?.data?.message || "Failed to launch viewer");
    }
  };

  const openReportSplit = (study: StudyRow) =>
    setSplitView({ active: true, study });

  const closeSplitView = () => {
    setSplitView({ active: false, study: null });
    setSplitMode("horizontal");
  };

  const getReportStatusFor = (s: StudyRow) => {
    const uid = s.studyInstanceUID ?? s.id;
    return reportStatusMap[uid] ?? { exists: false };
  };

  const actionLabelFor = (s: StudyRow) => {
    const st = getReportStatusFor(s);
    if (!st.exists) return "Create Report";
    if ((st.status || "").toLowerCase() === "draft") return "Continue Report";
    return "View Final Report";
  };

  // ---------------- RENDER ----------------
  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full">
      {/* HEADER SECTION (Matching other pages) */}
      {/* HEADER SECTION (Compact Single Row) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">

        {/* Title & Server Tabs (Grouped Left) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">PACS Explorer</h1>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-300 hidden sm:block" />

          {/* Server Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {servers.length > 0 ? servers.map((srv) => {
              const isActive = selected?.id === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => {
                    setSelected(srv);
                    fetchStudies(srv);
                  }}
                  className={`
                      px-3 py-1 text-xs font-semibold rounded-full transition-all border whitespace-nowrap
                      ${isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                    }
                    `}
                >
                  {srv.name}
                </button>
              );
            }) : (
              <span className="text-xs text-slate-500 italic">No servers</span>
            )}
          </div>
        </div>

        {/* RIGHT: Tools (Search, Date, Refresh) - Compact Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-[180px] text-sm bg-white border-slate-200 focus:border-indigo-500 transition-all"
            />
          </div>

          <DateFilter value={dateRange} onChange={setDateRange} align="right" />

          <Button
            variant="outline"
            size="icon"
            onClick={() => selected && fetchStudies(selected)}
            className="h-9 w-9 bg-white border-slate-200 text-slate-600 hover:text-indigo-600"
            title="Reload"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* CONTENT CARD (No internal scroll loop, native page scroll) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="mt-4 text-sm font-medium animate-pulse">Retrieving studies...</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <div className="bg-slate-50 p-6 rounded-full mb-4 ring-1 ring-slate-100">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Studies Found</h3>
              <p className="text-sm max-w-xs text-center mt-2 text-slate-500">
                Adjust your search filters or select a different PACS server.
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[12%]">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[8%]">Modality</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[12%]">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[12%]">Accession</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[8%]">Report</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[8%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.map((s, idx) => {
                    const rs = getReportStatusFor(s);
                    // Zebra striping via index oddity
                    const isStripe = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                    return (
                      <tr
                        key={s.id}
                        className={`${isStripe} hover:bg-indigo-50/40 transition-colors group cursor-pointer text-sm`}
                        onDoubleClick={() => openOHIF(s.studyInstanceUID ?? s.id)}
                        title="Double-click to open Viewer"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700 truncate max-w-[200px]" title={s.patientName}>{s.patientName || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-sm">{s.patientID || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shadow-sm",
                            getModalityColors(s.modality).bg,
                            getModalityColors(s.modality).text,
                            getModalityColors(s.modality).border
                          )}>
                            {s.modality || "UN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{s.date || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-sm">{s.accessionNumber || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 italic text-sm truncate max-w-[200px]" title={s.description}>{s.description || "No description"}</td>

                        {/* STATUS PILL */}
                        <td className="px-4 py-3 text-center">
                          {!rs.exists ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            </span>
                          ) : rs.status === "final" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 uppercase tracking-wide">
                              Final
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 uppercase tracking-wide">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1"
                                  title="Diagnostic Viewers"
                                >
                                  <Monitor className="w-4 h-4" />
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="text-indigo-600">iPacx Intelligent Viewers</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'ipacx_gold', 'workstation')}>
                                  <Monitor className="mr-2 h-4 w-4 text-indigo-500" />
                                  <span>iPacx Gold (Web Workspace)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'workstation_pro', 'workstation')}>
                                  <Monitor className="mr-2 h-4 w-4 text-purple-600" />
                                  <span>iPacx Workstation Pro</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'desktop', 'desktop')}>
                                  <Monitor className="mr-2 h-4 w-4 text-slate-600" />
                                  <span>iPacx Desktop Viewer</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'mobile_lite', 'mobile')}>
                                  <Layout className="mr-2 h-4 w-4 text-emerald-500" />
                                  <span>iPacx Mobile Lite (Quick View)</span>
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-slate-500">Diagnostic Integration</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'ohif')}>
                                  <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-blue-500 text-[10px] font-bold text-white">O</div>
                                  <span>OHIF Viewer v3</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'weasis')}>
                                  <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-orange-500 text-[10px] font-bold text-white">W</div>
                                  <span>Weasis Java (Full App)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLaunchViewer(s.studyInstanceUID ?? s.id, 'radiant')}>
                                  <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-red-600 text-[10px] font-bold text-white">R</div>
                                  <span>RadiAnt Viewer (Protocol)</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                              className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              title="Split View Reporting"
                              onClick={() => openReportSplit(normalizeStudy(s))}
                            >
                              <Columns className="w-4 h-4 text-indigo-500" />
                            </button>

                            <button
                              className="p-1.5 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
                              title="Full Page Reporting"
                              onClick={() => window.open(`/report/${s.studyInstanceUID ?? s.id}`, '_blank')}
                            >
                              <Maximize2 className="w-4 h-4 text-purple-600" />
                            </button>

                            <button
                              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              title="Create Appointment"
                              onClick={() => openCreateAppointmentFromStudy(s)}
                            >
                              <CalendarPlus className="w-4 h-4 text-emerald-500" />
                            </button>

                            <button
                              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Add to MWL"
                              onClick={() => openMWLModal(s)}
                            >
                              <ClipboardList className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* STICKY FOOTER PAGINATION */}
              <div className="flex justify-between items-center px-4 py-3 border-t border-slate-200 bg-white sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="text-slate-900">{(page - 1) * pageSize + 1}</span> – <span className="text-slate-900">{Math.min(page * pageSize, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 text-xs font-medium"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-2">
                    <span className="text-xs font-bold text-slate-700">Page {page} <span className="text-slate-400 font-normal">/ {totalPages}</span></span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 text-xs font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* APPOINTMENT MODAL */}
      {showApptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-[900px] max-h-[90vh] overflow-auto shadow-lg">
            <AppointmentScheduler
              prefill={apptPrefill}
              onSaved={() => {
                setShowApptModal(false);
                fetchStudies(selected ?? undefined);
              }}
            />
            <div className="text-right mt-4">
              <Button variant="outline" onClick={() => setShowApptModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT VIEW (OHIF + REPORT) - PORTAL TO BODY for TRUE FULL SCREEN */}
      {splitView.active && splitView.study && ReactDOM.createPortal(
        <div className="fixed-portal-root fixed inset-0 z-[9999] bg-[#0a0a0b] flex flex-col animate-in fade-in duration-300 font-sans">

          {/* HEADER: Ultra-Modern Dark Glass (Distraction-Free) */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-white/5 bg-[#0a0a0b] shrink-0 shadow-lg z-50">

            {/* Left: Patient Signature */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-white tracking-tight uppercase" title={splitView.study.patientName}>
                    {splitView.study.patientName || "Unknown Patient"}
                  </span>
                  <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[10px] font-black tracking-widest uppercase">
                    {splitView.study.modality}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  <span className="text-slate-400">ID: {splitView.study.patientID}</span>
                  <span className="text-slate-700">•</span>
                  <span>ACC: {splitView.study.accessionNumber || "N/A"}</span>
                  <span className="text-slate-700">•</span>
                  <span>DATE: {splitView.study.date}</span>
                </div>
              </div>
            </div>

            {/* Center: System Branding */}
            <div className="hidden lg:flex flex-col items-center">
              <span className="text-sm font-black text-white/40 tracking-[0.3em] uppercase">RIS-iPACX</span>
              <span className="text-[8px] font-bold text-blue-500/40 uppercase tracking-widest mt-0.5 italic">Clinical Diagnostic Workspace</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">PACS Link Active</span>
              </div>
              <button
                onClick={closeSplitView}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-red-600/90 text-white transition-all border border-white/10 hover:border-red-500/50 group"
                title="Exit Diagnostic Session"
              >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* LAYOUT: Adaptive 50/50 Workspace */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">

            {/* LEFT: Diagnostic Viewer (OHIF) */}
            <div className="w-1/2 h-full bg-black relative border-r border-white/5 shadow-2xl">
              <iframe
                title="Diagnostic Viewer"
                src={`${(import.meta as any).env.VITE_ORTHANC_URL || `http://${window.location.hostname}:8042`}/ohif/viewer?StudyInstanceUIDs=${encodeURIComponent(
                  splitView.study.studyInstanceUID ?? splitView.study.id ?? ""
                )}`}
                className="w-full h-full border-0 block"
                sandbox="allow-scripts allow-same-origin allow-forms"
                allow="clipboard-read; clipboard-write"
              />
              {/* Fallback indicator if black screen persists */}
              <div className="absolute bottom-4 left-4 pointer-events-none opacity-20">
                <span className="text-[10px] font-mono text-white">Viewer Source: Port 8042/OHIF</span>
              </div>
            </div>

            {/* RIGHT: Report */}
            <div className="w-1/2 h-full bg-slate-100 relative">
              <ReportEditor
                key={splitView.study.studyInstanceUID ?? splitView.study.id}
                studyUID={splitView.study.studyInstanceUID ?? splitView.study.id}
                hideViewer={true}
                initialPatient={{
                  patientName: (splitView.study.patientName || "").replace(/\^/g, " ").trim(),
                  patientID: splitView.study.patientID,
                  accessionNumber: splitView.study.accessionNumber,
                  modality: splitView.study.modality,
                  studyDate: splitView.study.date,
                }}
                onClose={closeSplitView}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
