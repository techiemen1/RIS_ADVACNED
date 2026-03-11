/* eslint-disable no-restricted-globals */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-hot-toast";
import {
  Plus,
  RefreshCw,
  UploadCloud,
  Trash2,
  Edit3,
  Search,
  HardDrive,
  Activity,
  Clock
} from "lucide-react";
import dayjs from "dayjs";
import { cn } from "../../lib/utils";
import { getModalityColors } from "../../utils/modalityColors";

type MWLEntry = {
  id?: number;
  pacs_id?: number | null;
  accession_number?: string;
  study_instance_uid?: string;
  patient_id?: string;
  patient_name?: string;
  modality?: string;
  scheduled_datetime?: string | null;
  status?: string;
  payload?: any;
  created_at?: string;
};

const DEFAULT_MODALITIES = ["ALL", "CR", "CT", "MR", "US", "DX", "MG", "NM"];

export default function MwlPage() {
  const [list, setList] = useState<MWLEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeModality, setActiveModality] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MWLEntry | null>(null);
  const [modalities] = useState<string[]>(DEFAULT_MODALITIES);
  const [reviewItem, setReviewItem] = useState<MWLEntry | null>(null);
  const [autoPush, setAutoPush] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.get("/mwl");
      console.log("MWL SYNC DATA:", r.data?.data);
      setList(r.data?.data ?? []);
    } catch (err) {
      console.error("load mwl", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = list;
    if (activeModality !== "ALL") {
      result = result.filter(m => m.modality === activeModality);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(m =>
        (m.patient_name || "").toLowerCase().includes(q) ||
        (m.patient_id || "").toLowerCase().includes(q) ||
        (m.accession_number || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [list, query, activeModality]);

  const stats = {
    total: list.length,
    new: list.filter(m => m.status === 'NEW').length,
    synced: list.filter(m => m.status === 'SYNCED' || m.status === 'COMPLETED').length,
  };

  const openNew = () => {
    setEditing({
      pacs_id: null,
      accession_number: "",
      study_instance_uid: "",
      patient_id: "",
      patient_name: "",
      modality: "CT",
      scheduled_datetime: dayjs().format("YYYY-MM-DDTHH:mm"),
    });
    setShowModal(true);
  };

  const onPushNow = async (row: MWLEntry) => {
    if (!autoPush) {
      setReviewItem(row);
      return;
    }
    await commitPush(row);
  };

  const commitPush = async (row: MWLEntry) => {
    const tid = toast.loading("Broadcasting to Modality...");
    try {
      const body = {
        pacs_id: row.pacs_id,
        patient_id: row.patient_id,
        patient_name: row.patient_name,
        accession_number: row.accession_number,
        study_instance_uid: row.study_instance_uid,
        modality: row.modality,
        scheduled_datetime: row.scheduled_datetime,
      };
      await axiosInstance.post("/mwl/register", body);
      toast.success("Study Transmitted Successfully", { id: tid });
      load();
    } catch (err) {
      console.error("push mwl", err);
      toast.error("Transmission Failed", { id: tid });
    }
  };

  const onDelete = async (row: MWLEntry) => {
    if (!row.id) return;
    if (!confirm("Remove this entry from active Worklist?")) return;
    try {
      await axiosInstance.delete(`/mwl/${row.id}`);
      load();
    } catch (err) {
      console.error("delete mwl", err);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* HUD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight uppercase">
            <Activity className="w-6 h-6 text-indigo-600" /> Modality Worklist (MWL)
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Dicom Service Class Provider Registry</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automation</span>
              <span className="text-xs font-bold text-slate-700">Auto-Push</span>
            </div>
            <button
              onClick={() => setAutoPush(!autoPush)}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                autoPush ? "bg-emerald-500" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                autoPush ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
            <div className="px-6 py-2 border-r border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">System Load</p>
              <p className="text-base font-black text-slate-700">{stats.total}</p>
            </div>
            <div className="px-6 py-2 border-r border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Awaiting Sync</p>
              <p className="text-base font-black text-amber-600">{stats.new}</p>
            </div>
            <div className="px-6 py-2 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Live Nodes</p>
              <p className="text-base font-black text-emerald-600">{stats.synced}</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-xl text-base font-black shadow-xl flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> New Study
          </button>
        </div>
      </div>

      {/* MODALITY CHIPS & SEARCH */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-wrap gap-2.5">
          {DEFAULT_MODALITIES.map(m => {
            const colors = getModalityColors(m);
            const isActive = activeModality === m;
            return (
              <button
                key={m}
                onClick={() => setActiveModality(m)}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-black tracking-widest transition-all uppercase border",
                  isActive
                    ? cn("shadow-md scale-105", colors.bg.replace('bg-', 'bg-').replace('50', '600'), "text-white", colors.border)
                    : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                )}
                // Override background for active state to be darker/solid if desired, or use the bg-600 variant
                style={isActive && m !== 'ALL' ? { backgroundColor: 'var(--tw-cls)' } : {}}
              >
                {m}
              </button>
            )
          })}
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Patient Name or Accession..."
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* HIGH-DENSITY WORKLIST GRID */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-lg font-bold">Synchronizing with Modality...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-lg font-bold uppercase tracking-widest">No Active Worklist Entries for {activeModality}</div>
        ) : (
          filtered.map((m) => {
            const colors = getModalityColors(m.modality);
            return (
              <div key={m.id} className={cn("bg-white p-4 rounded-xl border flex items-center justify-between group transition-all shadow-sm hover:shadow-md", colors.border)}>
                <div className="flex items-center gap-8 flex-1">
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-xs font-black shrink-0 shadow-sm", colors.bg, colors.text)}>
                      {m.modality}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight leading-none mb-1.5 uppercase">{m.patient_name}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-indigo-500 font-black tracking-tight">ID: {m.patient_id}</span>
                        <span className="text-xs text-slate-300 font-bold"> | </span>
                        <span className="text-xs font-black text-slate-400 uppercase">{m.accession_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:flex flex-col min-w-[150px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Schedule Sync</p>
                    <div className="flex items-center gap-2 font-bold text-slate-600 text-xs">
                      <Clock className="w-4 h-4 text-slate-300" />
                      {m.scheduled_datetime ? dayjs(m.scheduled_datetime).format("DD MMM · HH:mm") : "—"}
                    </div>
                  </div>

                  <div className="flex flex-col min-w-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sync status</p>
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        m.status === 'NEW' ? "bg-amber-400" : "bg-emerald-500"
                      )}></span>
                      <span className={cn(
                        "text-xs font-black uppercase tracking-tight",
                        m.status === 'NEW' ? "text-amber-600" : "text-emerald-600"
                      )}>{m.status || "IDLE"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onPushNow(m)}
                    className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                    title="Push to Modality"
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={load}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Update Repository Heartbeat
        </button>
      </div>

      {
        showModal && editing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-600" /> Modality Worklist Registry
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <MwlEditor
                initial={editing}
                modalities={modalities.filter(m => m !== 'ALL')}
                onSaved={async () => { setShowModal(false); setEditing(null); await load(); }}
                onCancel={() => { setShowModal(false); setEditing(null); }}
              />
            </div>
          </div>
        )
      }
      {/* 4. CLINICAL REVIEW MODAL (PRE-PUSH) */}
      {
        reviewItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-600" /> Confirm Study Broadcast
                </h3>
                <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Study Manifest</p>
                  <div className="grid grid-cols-2 gap-y-4 text-sm font-bold">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-medium">Patient Name</span>
                      <span className="text-slate-900 uppercase text-base">{reviewItem.patient_name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-medium">Patient ID</span>
                      <span className="text-slate-900 font-mono">{reviewItem.patient_id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-medium">Accession #</span>
                      <span className="text-emerald-600">{reviewItem.accession_number}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-medium">Modality</span>
                      <span className="text-indigo-600 uppercase">{reviewItem.modality}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                  <p className="text-xs text-slate-400 font-medium">This study will be registered as 'NEW' in the target Modality worklist.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setReviewItem(null)} className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-sm font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button
                  onClick={() => { commitPush(reviewItem); setReviewItem(null); }}
                  className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  Confirm & Broadcast
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

function MwlEditor({ initial, modalities, onSaved, onCancel }: any) {
  const [form, setForm] = useState<MWLEntry>(initial);

  const save = async () => {
    try {
      if (form.id) {
        await axiosInstance.put(`/mwl/${form.id}`, form);
      } else {
        await axiosInstance.post("/mwl/register", form);
      }
      onSaved();
    } catch (err) {
      console.error("save mwl", err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-1">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Identity Registry (ID)</label>
        <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={form.patient_id ?? ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="Enterprise MRN..." />
      </div>

      <div className="col-span-1">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Clinical Name</label>
        <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={form.patient_name ?? ""} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="Full Name..." />
      </div>

      <div className="col-span-1">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Source Modality</label>
        <select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
          {modalities.map((m: any) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="col-span-1">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Synchronization Time</label>
        <input type="datetime-local" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none" value={form.scheduled_datetime ?? ""} onChange={(e) => setForm({ ...form, scheduled_datetime: e.target.value })} />
      </div>

      <div className="col-span-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Accession Identifier</label>
        <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-emerald-600 uppercase outline-none" value={form.accession_number ?? ""} onChange={(e) => setForm({ ...form, accession_number: e.target.value })} placeholder="Unique Accession ID..." />
      </div>

      <div className="col-span-2 flex justify-end gap-3 mt-6 border-t pt-8">
        <button onClick={onCancel} className="px-8 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Abandon</button>
        <button onClick={save} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl">Commit To Worklist</button>
      </div>
    </div>
  );
}
