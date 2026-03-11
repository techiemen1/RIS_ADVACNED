// src/pages/Patients/PatientManagement.tsx
// MRN Rev: Shows MRN in table, inline MRN edit modal (admin/staff only),
// MRN field visible in registration form.

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePatients } from "../../hooks/usePatients";
import ModernPatientRegistration from "./ModernPatientRegistration";
import ConsentManager from "../../components/Patients/ConsentManager";
import { Patient } from "../../types/patient";
import { useRBAC } from "../../context/RoleContext";
import axiosInstance from "../../services/axiosInstance";
import {
  Users, UserPlus, Search, Calendar, FilePlus, FileSignature,
  Trash2, Edit2, Activity, Hash, Pencil, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import dayjs from "dayjs";
import { getModalityColors } from "../../utils/modalityColors";
import { getGenderColors } from "../../utils/genderColors";
import { cn } from "../../lib/utils";

/* ── Types ───────────────────────────────────────────────── */

interface MrnEditState {
  patientId: string | number;
  patientName: string;
  currentMrn: string;
  value: string;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/* ── MRN Edit Modal ──────────────────────────────────────── */

const MrnEditModal: React.FC<{
  state: MrnEditState;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ state, onChange, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Hash size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Edit Patient MRN</h3>
            <p className="text-xs text-slate-500">{state.patientName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <XCircle size={20} />
        </button>
      </div>

      {/* Current MRN */}
      <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Current MRN</p>
        <p className="font-mono text-sm font-semibold text-slate-700">
          {state.currentMrn || <span className="text-slate-400 italic">Not assigned</span>}
        </p>
      </div>

      {/* New MRN Input */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
          New MRN <span className="text-rose-500">*</span>
        </label>
        <Input
          id="mrn-edit-input"
          value={state.value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g. MRN-2603-000099"
          className="font-mono uppercase tracking-wider border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          disabled={state.loading}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && !state.loading && onConfirm()}
        />
        <p className="text-[10px] text-slate-400 mt-1.5">
          Allowed: letters, digits, hyphens, underscores. Max 50 chars.
          Auto-format: <span className="font-mono">MRN-YYMM-NNNNNN</span>
        </p>
      </div>

      {/* Error / Success */}
      {state.error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-sm text-emerald-700">
          <CheckCircle size={16} />
          <span>MRN updated successfully!</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 border-slate-200"
          onClick={onClose}
          disabled={state.loading}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={onConfirm}
          disabled={state.loading || !state.value.trim()}
          id="mrn-confirm-btn"
        >
          {state.loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle size={16} /> Confirm MRN
            </span>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-center text-slate-400 mt-3">
        ⚠️ MRN changes are audit-logged. Ensure clinical coordination before editing.
      </p>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */

const PatientManagement: React.FC = () => {
  const { user } = useRBAC();
  const role = user?.role ?? "viewer";
  const { patients, addPatient, updatePatient, deletePatient, refetch } = usePatients();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [selectedPatientForConsent, setSelectedPatientForConsent] = useState<Patient | null>(null);
  const [mrnEdit, setMrnEdit] = useState<MrnEditState | null>(null);
  const navigate = useNavigate();

  const canEdit    = role === "admin" || role === "radiologist" || role === "receptionist" || role === "staff";
  const canEditMrn = role === "admin" || role === "staff";

  /* ── Search filter ──────────────────────────────── */
  const filtered = patients.filter((p) => {
    const q    = search.toLowerCase();
    const name = (p.name || p.first_name + " " + p.last_name || "").toLowerCase();
    const id   = (p.id || "").toString().toLowerCase();
    const mrn  = (p.mrn || "").toLowerCase();
    const uid  = (p.aadhaarNumber || "").toLowerCase();
    return name.includes(q) || id.includes(q) || mrn.includes(q) || uid.includes(q);
  });

  /* ── Handlers ───────────────────────────────────── */
  const handleAdd    = (data: Omit<Patient, "id">) => { addPatient(data); setEditing(null); };
  const handleUpdate = (data: Omit<Patient, "id">) => {
    if (editing) updatePatient(editing.id, data);
    setEditing(null);
  };

  const handleBookAppointment = (p: Patient) =>
    navigate(`/appointments?patient_id=${p.id}&patient_name=${encodeURIComponent(p.name || "")}`);

  const handleOrderScan = (p: Patient) =>
    navigate(`/orders?patient_id=${p.id}&patient_name=${encodeURIComponent(p.name || "")}`);

  /* ── MRN Edit ───────────────────────────────────── */
  const openMrnEdit = (p: Patient) => {
    setMrnEdit({
      patientId:   p.id,
      patientName: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
      currentMrn:  p.mrn || "",
      value:       p.mrn || "",
      loading:     false,
      error:       null,
      success:     false,
    });
  };

  const confirmMrnEdit = useCallback(async () => {
    if (!mrnEdit) return;
    setMrnEdit(s => s ? { ...s, loading: true, error: null, success: false } : null);

    try {
      await axiosInstance.patch(`/patients/${mrnEdit.patientId}/mrn`, { mrn: mrnEdit.value });
      setMrnEdit(s => s ? { ...s, loading: false, success: true } : null);
      // Refresh patient list so the table shows updated MRN
      if (typeof refetch === "function") refetch();
      setTimeout(() => setMrnEdit(null), 1500);  // Close after showing success
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to update MRN";
      setMrnEdit(s => s ? { ...s, loading: false, error: msg } : null);
    }
  }, [mrnEdit, refetch]);

  /* ── Stats ──────────────────────────────────────── */
  const stats = {
    total:  patients.length,
    today:  patients.filter(p => p.date && dayjs(p.date).isSame(dayjs(), "day")).length,
    recent: patients.slice(0, 5),
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">

      {/* ── HEADER & STATS ─────────────────────────────── */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Patient Management</h1>
            <p className="text-slate-500 mt-1">Central registry for patient demographics and clinical history</p>
          </div>
          {canEdit && (
            <Button
              onClick={() => setEditing({} as Patient)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 gap-2"
            >
              <UserPlus size={18} /> Register New Patient
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Registered Patients" value={stats.total}
                    icon={<Users className="text-blue-500" />} trend="+12% this month" />
          <StatCard label="New Registrations Today" value={stats.today}
                    icon={<Activity className="text-emerald-500" />} trend="Active today" />
          <StatCard label="Pending Consents" value={1}
                    icon={<FileSignature className="text-amber-500" />} trend="Action required" />
        </div>
      </div>

      {/* ── TABLE CARD ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by Name, MRN, Patient ID or Aadhaar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-indigo-500"
            />
          </div>
          {canEditMrn && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
              <Hash size={12} />
              Click MRN badge to edit
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Patient Info</th>
                <th className="px-6 py-4">Demographics</th>
                {/* MRN column — now separated from the generic ID column */}
                <th className="px-6 py-4">MRN</th>
                <th className="px-6 py-4">IDs (Aadhaar / DB)</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const displayName = p.name ||
                  `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown Patient";
                return (
                  <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors group">

                    {/* Patient Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm",
                          getModalityColors(p.modality).bg,
                          getModalityColors(p.modality).text
                        )}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {displayName}
                            {p.modality && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-[3px] text-[9px] uppercase tracking-wider font-bold border",
                                getModalityColors(p.modality).bg,
                                getModalityColors(p.modality).text,
                                getModalityColors(p.modality).border
                              )}>
                                {p.modality}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{p.studyDescription || "General checkup"}</div>
                        </div>
                      </div>
                    </td>

                    {/* Demographics */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                        getGenderColors(p.gender).bg,
                        getGenderColors(p.gender).text,
                        getGenderColors(p.gender).border
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", getGenderColors(p.gender).indicator)} />
                        {p.age} Yrs • {p.gender}
                      </span>
                    </td>

                    {/* MRN — clickable badge for admin/staff edit */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => canEditMrn ? openMrnEdit(p) : undefined}
                        title={canEditMrn ? "Click to edit MRN" : "MRN (read-only)"}
                        className={cn(
                          "group/mrn inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border transition-all",
                          p.mrn
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-rose-50 text-rose-400 border-rose-200 italic",
                          canEditMrn && "hover:bg-indigo-100 hover:border-indigo-400 hover:shadow-sm cursor-pointer"
                        )}
                      >
                        <Hash size={11} />
                        <span>{p.mrn || "Not assigned"}</span>
                        {canEditMrn && (
                          <Pencil
                            size={10}
                            className="opacity-0 group-hover/mrn:opacity-100 transition-opacity text-indigo-400"
                          />
                        )}
                      </button>
                    </td>

                    {/* System IDs */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-600">DB: {p.id}</div>
                      {p.aadhaarNumber && (
                        <div className="font-mono text-[10px] text-slate-400">UID: {p.aadhaarNumber}</div>
                      )}
                    </td>

                    {/* Last Visit */}
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {p.date ? dayjs(p.date).format("MMM D, YYYY") : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleBookAppointment(p)}
                          title="Book Appointment"
                          className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                        >
                          <Calendar size={16} />
                        </button>
                        <button
                          onClick={() => handleOrderScan(p)}
                          title="Order Scan"
                          className="p-2 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                        >
                          <FilePlus size={16} />
                        </button>
                        <button
                          onClick={() => setSelectedPatientForConsent(p)}
                          title="Manage Consents"
                          className="p-2 bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                        >
                          <FileSignature size={16} />
                        </button>

                        {/* MRN Edit shortcut button (admin/staff only) */}
                        {canEditMrn && (
                          <button
                            onClick={() => openMrnEdit(p)}
                            title="Edit MRN"
                            className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                          >
                            <Hash size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => setEditing(p)}
                          title="Edit Details"
                          className="p-2 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                        >
                          <Edit2 size={16} />
                        </button>

                        {role === "admin" && (
                          <button
                            onClick={() => deletePatient(p.id)}
                            title="Delete Patient"
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-20" />
                      <p>No patients found matching "{search}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MRN EDIT MODAL ─────────────────────────── */}
      {mrnEdit && (
        <MrnEditModal
          state={mrnEdit}
          onChange={(v) => setMrnEdit(s => s ? { ...s, value: v, error: null } : null)}
          onConfirm={confirmMrnEdit}
          onClose={() => setMrnEdit(null)}
        />
      )}

      {/* ── PATIENT FORM MODAL ─────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editing.id
                  ? <><Edit2 size={20} className="text-indigo-500" /> Edit Patient Record</>
                  : <><UserPlus size={20} className="text-indigo-500" /> New Patient Registration</>
                }
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-0">
              <ModernPatientRegistration
                initialData={editing.id ? editing : null}
                onSubmit={editing.id ? handleUpdate : handleAdd}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONSENT MODAL ──────────────────────────── */}
      {selectedPatientForConsent && (
        <ConsentManager
          patientId={selectedPatientForConsent.id.toString()}
          patientName={selectedPatientForConsent.name || "Unknown Patient"}
          onClose={() => setSelectedPatientForConsent(null)}
        />
      )}
    </div>
  );
};

/* ── Stat Card ───────────────────────────────────────────── */

function StatCard({
  label, value, icon, trend
}: {
  label: string; value: number; icon: React.ReactNode; trend?: string;
}) {
  return (
    <Card className="border-none shadow-sm bg-white/80 backdrop-blur ring-1 ring-slate-200/60">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <h4 className="text-3xl font-extrabold text-slate-800">{value}</h4>
          {trend && <p className="text-xs text-slate-400 mt-2 font-medium">{trend}</p>}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default PatientManagement;
