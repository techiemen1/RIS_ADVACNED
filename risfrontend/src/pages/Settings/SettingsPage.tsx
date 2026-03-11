// src/pages/Settings/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import UserManagement from "../Admin/UserManagement";
import PACSManagement from "../Admin/PACSManagement";
import ReportTemplatesManager from "./ReportTemplatesManager";
import BillingSettingsManager from "./BillingSettingsManager";
import ReferenceDataManager from "./ReferenceDataManager";
import ModalitySettings from "./ModalitySettings";
import VocabularySettings from "./VocabularySettings";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

const TABS = [
  { id: "system", label: "System & Security" },
  { id: "org", label: "Organization" },
  { id: "users", label: "Staff & Teams" },
  { id: "dicom", label: "DICOM Network" },
  { id: "clinical", label: "Clinical Workflow" },
  { id: "billing", label: "Billing & GST" },
  { id: "templates", label: "Report Templates" },
  { id: "lexicon", label: "Medical Lexicon" },
  { id: "ai", label: "AI & Reporting" },
  { id: "devops", label: "DevOps & Diagnostics" },
  { id: "danger", label: "Danger Zone" },
];

const DangerAction = ({ label, actionType, onConfirm }: { label: string, actionType: string, onConfirm: () => Promise<void> }) => {
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (input !== "DELETE") return;
    setLoading(true);
    try {
      await onConfirm();
      setConfirming(false);
      setInput("");
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="mt-4 p-4 bg-white rounded border border-red-200 shadow-sm animate-in fade-in zoom-in duration-200">
        <p className="text-sm font-bold text-red-700 mb-2">Type "DELETE" to confirm {label}:</p>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="DELETE"
            className="h-9 text-sm border-red-300 focus:border-red-500 max-w-[120px]"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={input !== "DELETE" || loading}
            onClick={handleConfirm}
          >
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setInput(""); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
      {label}
    </Button>
  );
};

export default function SettingsPage() {
  const [active, setActive] = useState<string>("system");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dangerFilters, setDangerFilters] = useState({ patientId: "", accession: "", dateFrom: "", dateTo: "" });

  const load = async () => {
    try {
      setLoading(true);
      const r = await axiosInstance.get("/settings");
      setSettings(r.data?.data ?? {});
    } catch (err) {
      console.error("load settings", err);
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateNested = (path: string[], value: any) => {
    setSettings((prev: any) => {
      const clone = { ...(prev || {}) };
      let cur = clone;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!cur[k]) cur[k] = {};
        cur = cur[k];
      }
      cur[path[path.length - 1]] = value;
      return clone;
    });
  };

  const saveKey = async (key: string, value: any) => {
    setSaving(true);
    try {
      await axiosInstance.post("/settings", { key, value });
      await load();
      try { toast?.success?.("Saved"); } catch { }
    } catch (err) {
      console.error("save settings", err);
      try { toast?.error?.("Save failed"); } catch { }
      alert("Save failed — check console for details");
    } finally {
      setSaving(false);
    }
  };

  const system = settings?.system ?? {};
  const org = settings?.org ?? {};
  const clinical = settings?.clinical ?? {};
  const ai = settings?.ai ?? {};
  const devops = settings?.devops ?? {};

  const SecurityTips: React.FC = () => (
    <div className="text-sm text-gray-600 space-y-2">
      <div>Security quick tips:</div>
      <ul className="list-disc list-inside ml-3">
        <li>Restrict API & UI access to your LAN / VPN.</li>
        <li>Use HTTPS and strong JWT secret rotated periodically.</li>
        <li>Enable audit logging and role-based finalization for reports.</li>
      </ul>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SYSTEM CONFIG CENTER</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">iPacx Architect Enterprise Gen 2</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={load} disabled={loading} className="font-bold uppercase tracking-widest text-[10px] border-slate-300">
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative
              ${active === t.id
                ? "text-slate-900"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            {t.label}
            {active === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {active === "system" && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 mb-4">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Security Configuration</CardTitle>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Last Sync: {settings?.meta?.loaded_at ? dayjs(settings.meta.loaded_at).format("YYYY-MM-DD HH:mm") : "—"}</div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Allowed LAN CIDR</label>
                  <Input
                    className="font-mono text-xs"
                    value={system.lanCidr ?? "192.168.0.0/16"}
                    onChange={(e) => updateNested(["system", "lanCidr"], e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">JWT Token Expiry (Min)</label>
                  <Input
                    type="number"
                    value={system.jwtExpiry ?? 1440}
                    onChange={(e) => updateNested(["system", "jwtExpiry"], Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Audit Logger Status</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                    value={system.audit ?? "on"}
                    onChange={(e) => updateNested(["system", "audit"], e.target.value)}
                  >
                    <option value="on">ENABLED</option>
                    <option value="off">DISABLED</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-3">
                <Button onClick={() => saveKey("system", system)} disabled={saving} className="bg-slate-900 border-none hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Commit Changes</Button>
                <Button variant="outline" onClick={() => { setSettings((s: any) => ({ ...s, system: {} })); }} className="text-[10px] font-black uppercase tracking-widest">Reset Form</Button>
                <div className="ml-auto opacity-60">
                  <SecurityTips />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "org" && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 mb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Institution Identity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Hospital / Clinic Full Name</label>
                  <Input
                    value={org.name ?? ""}
                    onChange={(e) => updateNested(["org", "name"], e.target.value)}
                    placeholder="e.g. CITY GENERAL HOSPITAL & RESEARCH CENTER"
                    className="font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Physical Location (Footer Address)</label>
                  <Input
                    value={org.address ?? ""}
                    onChange={(e) => updateNested(["org", "address"], e.target.value)}
                    placeholder="FULL STREET ADDRESS, CITY, PIN"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Clinical Enquiry Hotline</label>
                  <Input
                    value={org.enquiryPhone ?? ""}
                    onChange={(e) => updateNested(["org", "enquiryPhone"], e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Administrative Contact</label>
                  <Input
                    value={org.contactPhone ?? ""}
                    onChange={(e) => updateNested(["org", "contactPhone"], e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Organization Email (Report Header)</label>
                  <Input
                    value={org.email ?? ""}
                    onChange={(e) => updateNested(["org", "email"], e.target.value)}
                    placeholder="info@hospital.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">Website URL</label>
                  <Input
                    value={org.website ?? ""}
                    onChange={(e) => updateNested(["org", "website"], e.target.value)}
                    placeholder="www.hospital.com"
                  />
                </div>

                <div className="md:col-span-2 mt-4 p-4 border border-amber-500/30 bg-amber-50/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-amber-900 tracking-widest uppercase">Multi-Branch Architecture</h4>
                      <p className="text-xs font-bold text-amber-700/70 uppercase tracking-wider mt-1">Enable strict data isolation across multiple clinical locations. Administrators gain a master dashboard.</p>
                    </div>
                    <div>
                      <select
                        className="border-amber-300 rounded font-black text-xs uppercase p-2 tracking-widest bg-white focus:ring-amber-500"
                        value={org.isMultiBranch ? "yes" : "no"}
                        onChange={async (e) => {
                          const isEnabled = e.target.value === "yes";
                          updateNested(["org", "isMultiBranch"], isEnabled);
                          // Sync with actual DB toggle column for hospital_settings
                          toast.promise(
                             axiosInstance.post('/settings', { key: 'is_multi_branch', value: isEnabled }),
                             { loading: 'Updating DB schema constraints...', success: 'Architecture mode updated!', error: 'Failed to toggle mode' }
                          );
                        }}
                      >
                        <option value="no">Single Location</option>
                        <option value="yes">Multi-Branch Network</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50">
                <Button onClick={() => saveKey("org", org)} disabled={saving} className="bg-slate-900 border-none hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Update Identity</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "users" && (
          <div className="space-y-12">
            <section>
              <div className="mb-4 px-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-amber-500" />
                  Phase 1: Structural Hierarchy
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Define your departments and designations first</p>
              </div>
              <ReferenceDataManager />
            </section>

            <section>
              <div className="mb-4 px-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-amber-500" />
                  Phase 2: Staff Registry
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Create user accounts using the hierarchy defined above</p>
              </div>
              <UserManagement />
            </section>
          </div>
        )}

        {active === "dicom" && (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-xl bg-slate-900 text-white shadow-lg border border-slate-800">
              <div className="relative z-10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-[0.1em] uppercase">DICOM Infrastructure</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Primary Imaging Network Control</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global AE Title</span>
                    <span className="text-xs font-mono font-bold text-amber-500">RIS_MWL</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Command</span>
                    <span className="text-xs font-mono font-bold text-white uppercase">Port 11117</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mt-16 -mr-16" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-8 w-1 bg-amber-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Inbound Acquisition (Modalities)</span>
                </div>
                <ModalitySettings />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-8 w-1 bg-amber-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Persistence Nodes (PACS/Cloud)</span>
                </div>
                <PACSManagement />
              </div>
            </div>
          </div>
        )}

        {active === "clinical" && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 mb-4"><CardTitle className="text-sm font-black uppercase tracking-widest">Clinical Logic</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Active Modality Codes (CSV)</label>
                  <Input
                    value={(clinical?.modalities ?? ["CR", "CT", "MR"]).join(",")}
                    onChange={(e) =>
                      updateNested(["clinical", "modalities"], e.target.value.split(",").map((s: string) => s.trim()))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Accession ID Prefix</label>
                  <Input
                    value={clinical?.accessionPrefix ?? ""}
                    onChange={(e) => updateNested(["clinical", "accessionPrefix"], e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50">
                <Button onClick={() => saveKey("clinical", clinical)} disabled={saving} className="bg-slate-900 border-none hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Update Workflow</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "templates" && <ReportTemplatesManager />}
        {active === "lexicon" && <VocabularySettings />}
        {active === "ai" && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 mb-4"><CardTitle className="text-sm font-black uppercase tracking-widest">Intelligence Engine</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Primary LLM Model</label><Input value={ai?.model ?? "gpt-4o-mini"} onChange={(e) => updateNested(["ai", "model"], e.target.value)} /></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Creative Threshold (Temp)</label><Input type="number" step="0.05" value={ai?.temp ?? 0.25} onChange={(e) => updateNested(["ai", "temp"], Number(e.target.value))} /></div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50"><Button onClick={() => saveKey("ai", ai)} disabled={saving} className="bg-slate-900 border-none hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Apply Models</Button></div>
            </CardContent>
          </Card>
        )}
        {active === "billing" && <BillingSettingsManager />}

        {active === "devops" && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 mb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Developer Toolkit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Cluster Telemetry (Verbose)</label>
                  <select value={devops?.verbose ? "on" : "off"} onChange={(e) => updateNested(["devops", "verbose"], e.target.value === "on")} className="w-full border rounded px-3 py-2 text-sm bg-white">
                    <option value="on">ACTIVE</option>
                    <option value="off">SILENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Endpoint Monitor URL</label>
                  <Input value={devops?.healthUrl ?? "/health"} onChange={(e) => updateNested(["devops", "healthUrl"], e.target.value)} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
                <Button onClick={() => saveKey("devops", devops)} disabled={saving} className="bg-slate-900 border-none hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Commit Dev Config</Button>
                <Button variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-300" onClick={() => {
                  (async () => {
                    try {
                      const r = await axiosInstance.get(devops?.healthUrl ?? "/health");
                      toast.success(`Cluster Status: ${r.status}`);
                    } catch (err) {
                      toast.error("Cluster link failed");
                    }
                  })();
                }}>
                  Ping Cluster
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DANGER ZONE */}
        {active === "danger" && (
          <Card className="border-red-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-red-50/50 border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                CRITICAL TERMINATION AREA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="bg-red-50 text-red-800 p-4 rounded-xl text-xs font-bold leading-relaxed border border-red-100 uppercase tracking-wider">
                <strong>LEGAL OVERRIDE REQUIRED:</strong> DATA DESTRUCTION IN THIS AREA IS IRREVERSIBLE. ALL ACTIONS ARE AUDITED TO THE ROOT SYSTEM ACCOUNT.
              </div>

              {/* Filters Section */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-white mb-4 flex items-center gap-3 uppercase tracking-[0.2em]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Selective Sequence Purge
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Sequence ID (Patient)</label>
                    <Input
                      value={dangerFilters.patientId}
                      onChange={e => setDangerFilters(p => ({ ...p, patientId: e.target.value }))}
                      placeholder="PAT-CORE-00"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Entry Ref (Accession)</label>
                    <Input
                      value={dangerFilters.accession}
                      onChange={e => setDangerFilters(p => ({ ...p, accession: e.target.value }))}
                      placeholder="ACC-CORE-00"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Sequence Start</label>
                    <Input
                      type="date"
                      value={dangerFilters.dateFrom}
                      onChange={e => setDangerFilters(p => ({ ...p, dateFrom: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white invert"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Sequence End</label>
                    <Input
                      type="date"
                      value={dangerFilters.dateTo}
                      onChange={e => setDangerFilters(p => ({ ...p, dateTo: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white invert"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-slate-200 rounded-2xl p-6 bg-white hover:border-red-200 transition-colors flex flex-col">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Findings Repository</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed mb-6 flex-1">
                    Purge report objects matching filters. Baseline patient data remains intact.
                  </p>
                  <DangerAction
                    label="Purge Findings"
                    actionType="reports"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "reports", filters: dangerFilters });
                      toast.success("Findings Purged");
                    }}
                  />
                </div>

                <div className="border border-slate-200 rounded-2xl p-6 bg-white hover:border-red-200 transition-colors flex flex-col">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Order Sequencer</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed mb-6 flex-1">
                    Purge orders, schedule, and financial ledgers. Patient record registry is preserved.
                  </p>
                  <DangerAction
                    label="Purge Orders"
                    actionType="orders"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "orders", filters: dangerFilters });
                      toast.success("Sequence Purged");
                    }}
                  />
                </div>

                <div className="border border-slate-200 rounded-2xl p-6 bg-red-900 shadow-2xl flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mt-10 -mr-10 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2">Nucleus Purge</h3>
                  <p className="text-[10px] font-bold text-red-100/50 uppercase leading-relaxed mb-6 flex-1">
                    Complete institutional data destruction matching filters. High risk of total data loss.
                  </p>
                  <DangerAction
                    label="Purge Nucleus"
                    actionType="everything"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "everything", filters: dangerFilters });
                      toast.success("Institutional Wiped");
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

