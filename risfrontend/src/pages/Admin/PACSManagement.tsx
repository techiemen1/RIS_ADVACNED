// src/pages/Admin/PACSManagement.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Server, Database, Activity, Globe, Wifi, ShieldCheck,
  Trash2, Edit3, Plus, RotateCw, CheckCircle2, XCircle, Settings2
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface PACSConfig {
  id?: number;
  name: string;
  type: "Orthanc" | "DCM4CHEE" | "DICOMweb" | "DIMSE";
  protocol: "DIMSE" | "DICOMWEB";
  host: string;
  port: number;
  aeTitle?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  is_active?: boolean;
  description?: string;
  wado_uri?: string;
  wado_rs?: string;
  qido_rs?: string;
  stow_rs?: string;
  viewer_url?: string;
  viewer_type?: string;
  updated_at?: string;
  last_connected?: string;
}

const defaultForm: PACSConfig = {
  name: "",
  type: "Orthanc", // Default template
  protocol: "DICOMWEB",
  host: "localhost",
  port: 8042,
  aeTitle: "ORTHANC",
  baseUrl: "http://localhost:8042",
  username: "",
  password: "",
  is_active: true,
  description: "",
  wado_uri: "/wado",
  wado_rs: "/dicom-web",
  qido_rs: "/dicom-web",
  stow_rs: "/dicom-web",
  viewer_url: "",
};

const PACSManagement: React.FC = () => {
  const [pacsList, setPacsList] = useState<PACSConfig[]>([]);
  const [formData, setFormData] = useState<PACSConfig>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchPACS = async () => {
    try {
      setLoading(true);
      const r = await axiosInstance.get("/pacs");
      const data = (r.data?.data ?? []).map((p: any) => ({
        ...p,
        aeTitle: p.aetitle,
        baseUrl: p.base_url
      }));
      setPacsList(data);
      setMessage(null);
    } catch (err) {
      console.error("fetchPACS", err);
      // setMessage({ type: 'error', text: "Failed to load PACS list." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPACS();
  }, []);

  // Pre-fill defaults based on Type selection
  const handleTypeChange = (type: string) => {
    let update: Partial<PACSConfig> = { type: type as any };
    if (type === 'Orthanc') {
      update = { ...update, protocol: 'DICOMWEB', port: 8042, wado_rs: '/dicom-web', qido_rs: '/dicom-web' };
    } else if (type === 'DCM4CHEE') {
      update = { ...update, protocol: 'DICOMWEB', port: 8080, wado_rs: '/dcm4chee-arc/aets/DCM4CHEE/rs', qido_rs: '/dcm4chee-arc/aets/DCM4CHEE/rs' };
    } else if (type === 'DIMSE') {
      update = { ...update, protocol: 'DIMSE', port: 104, aeTitle: 'REMOTE_AE' };
    }
    setFormData(prev => ({ ...prev, ...update }));
  };

  const normalizePayload = (payload: PACSConfig) => ({
    ...payload,
    aetitle: payload.aeTitle || null,   // maps aeTitle -> aetitle
    aeTitle: undefined,                 // avoid sending duplicate under wrong name
    base_url: payload.baseUrl || null,  // maps baseUrl -> base_url
    baseUrl: undefined,                 // avoid sending duplicate under wrong name
    viewer_type: payload.viewer_type || 'ohif'
  });

  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.port) {
      setMessage({ type: 'error', text: "Please fill required fields (Name, Host, Port)." });
      return;
    }
    try {
      setLoading(true);
      if (editingId) {
        await axiosInstance.put(`/pacs/${editingId}`, normalizePayload(formData));
        setMessage({ type: 'success', text: "Configuration updated successfully." });
      } else {
        await axiosInstance.post("/pacs", normalizePayload(formData));
        setMessage({ type: 'success', text: "New Server added successfully." });
      }
      setFormData(defaultForm);
      setEditingId(null);
      fetchPACS();
    } catch (err: any) {
      console.error("Save PACS error", err);
      const detail = err?.response?.data?.message || err.message;
      setMessage({ type: 'error', text: `Save Failed: ${detail}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id || !window.confirm("Are you sure you want to remove this server configuration?")) return;
    try {
      await axiosInstance.delete(`/pacs/${id}`);
      fetchPACS();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTest = async (id?: number) => {
    if (!id) return;
    const target = pacsList.find(p => p.id === id);
    if (!target) return;

    // Optimistic UI update
    const toastId = `test-${id}`;
    // You could use toast.loading here if library available

    try {
      const res = await axiosInstance.post(`/pacs/${id}/test`);
      if (res.data?.ok) {
        alert(`✅ ${res.data.message}\n${res.data.detail || ''}`);
        fetchPACS(); // Refresh to update last_connected
      } else {
        alert(`❌ ${res.data.message}\n${res.data.detail || ''}`);
      }
    } catch (err: any) {
      alert(`Connection Failed: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create / Edit Card */}
      <Card className="border-indigo-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b px-6 py-4 flex justify-between items-center">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              {editingId ? <Edit3 size={18} className="text-indigo-600" /> : <Plus size={18} className="text-emerald-600" />}
              {editingId ? "Edit Server Configuration" : "Add New PACS / DICOM Server"}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">Configure external nodes for Storage, Query/Retrieve, and Archival.</p>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={() => { setFormData(defaultForm); setEditingId(null); }}>Cancel Edit</Button>
          )}
        </div>

        <CardContent className="p-6">
          {message && (
            <div className={`mb-4 p-3 rounded text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Type Selection */}
            <div className="lg:col-span-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Server Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Orthanc', 'DCM4CHEE', 'DICOMweb', 'DIMSE'].map(t => (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`text-xs py-2 px-1 rounded border transition-colors ${formData.type === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Protocol Read-only display */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Protocol</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded text-sm text-slate-700 font-mono">
                  {formData.protocol === 'DIMSE' ? <Activity size={14} className="text-amber-500" /> : <Globe size={14} className="text-blue-500" />}
                  {formData.protocol}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Friendly Name</label>
                <Input placeholder="e.g. Main Hospital PACS" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
            </div>

            {/* Connection Details */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Host / IP Address</label>
              <Input placeholder="192.168.x.x" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Port</label>
              <Input type="number" value={formData.port} onChange={e => setFormData({ ...formData, port: Number(e.target.value) })} />
            </div>

            {/* Conditional Fields based on Protocol */}
            {formData.protocol === 'DIMSE' ? (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Remote AE Title</label>
                <Input placeholder="ORTHANC" value={formData.aeTitle} onChange={e => setFormData({ ...formData, aeTitle: e.target.value })} />
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Base URL</label>
                <Input placeholder="http://localhost:8042" value={formData.baseUrl} onChange={e => setFormData({ ...formData, baseUrl: e.target.value })} />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-indigo-600 mb-1.5 block">Viewer Protocol</label>
              <select 
                value={formData.viewer_type || 'ohif'} 
                onChange={e => setFormData({ ...formData, viewer_type: e.target.value as any })}
                className="w-full h-10 px-3 rounded-md border border-indigo-100 focus:border-indigo-300 text-sm bg-white"
              >
                <option value="ohif">OHIF (Web-based)</option>
                <option value="weasis">Weasis (Native/Web)</option>
                <option value="radiant">RadiAnt (Local Desktop)</option>
                <option value="ipacx_gold">iPacx Gold (Internal)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-indigo-600 mb-1.5 block flex justify-between">
                <span>Viewer Base URL (Optional)</span>
                <span className="text-[10px] lowercase font-normal opacity-70">
                  {formData.viewer_type === 'ohif' ? 'e.g. http://ip:port/ohif' : 
                   formData.viewer_type === 'radiant' ? 'No URL needed (uses protocol handler)' :
                   formData.viewer_type === 'weasis' ? 'e.g. http://ip:port/weasis-pacs-connector' : ''}
                </span>
              </label>
              <Input 
                placeholder={formData.viewer_type === 'ohif' ? "http://192.168.1.34:8042/ohif" : "Optional for custom viewers"} 
                value={formData.viewer_url} 
                onChange={e => setFormData({ ...formData, viewer_url: e.target.value })} 
                className="border-indigo-100 focus:border-indigo-300"
                disabled={formData.viewer_type === 'radiant'}
              />
            </div>

            {/* Advanced Toggle */}
            <div className="md:col-span-2 lg:col-span-4 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
              >
                <Settings2 size={12} /> {showAdvanced ? 'Hide Advanced config' : 'Show Advanced config (WADO/QIDO)'}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-4 bg-slate-50 rounded border border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">WADO-RS Path</label>
                    <Input className="bg-white h-8 text-xs" value={formData.wado_rs} onChange={e => setFormData({ ...formData, wado_rs: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">QIDO-RS Path</label>
                    <Input className="bg-white h-8 text-xs" value={formData.qido_rs} onChange={e => setFormData({ ...formData, qido_rs: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">STOW-RS Path</label>
                    <Input className="bg-white h-8 text-xs" value={formData.stow_rs} onChange={e => setFormData({ ...formData, stow_rs: e.target.value })} />
                  </div>
                  {/* Auth moved to advanced */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Username</label>
                    <Input className="bg-white h-8 text-xs" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Password</label>
                    <Input className="bg-white h-8 text-xs" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {editingId ? "Update Configuration" : "Save Server"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List View */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pacsList.map((pacs) => (
          <div key={pacs.id} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            {/* Status Stripe */}
            <div className={`absolute top-0 left-0 w-1 h-full ${pacs.last_connected ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

            <div className="p-4 pl-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {pacs.protocol === 'DIMSE'
                    ? <Activity size={16} className="text-amber-600" />
                    : <Globe size={16} className="text-blue-600" />
                  }
                  <span className="font-bold text-slate-800 text-sm">{pacs.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-slate-50 text-slate-500 border-slate-200">{pacs.type}</Badge>
              </div>

              <div className="space-y-1 mb-4">
                <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                  <span className="opacity-50">HOST:</span> {pacs.host}:{pacs.port}
                </div>
                {pacs.protocol === 'DIMSE' ? (
                  <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                    <span className="opacity-50">AET :</span> <span className="text-indigo-700 font-bold">{pacs.aeTitle}</span>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-600 flex items-center gap-2 truncate max-w-[200px]">
                    <span className="opacity-50">URL :</span> <span className="truncate">{pacs.baseUrl}</span>
                  </div>
                )}
                {pacs.viewer_url || pacs.viewer_type ? (
                  <div className="text-[10px] text-indigo-500 font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck size={10} /> {pacs.viewer_type?.toUpperCase() || 'EXTERNAL'} Viewer Configured
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  {pacs.last_connected ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Wifi size={10} /> Online {dayjs(pacs.last_connected).fromNow(true)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Wifi size={10} /> Never checked
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => { setEditingId(pacs.id!); setFormData(pacs); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <Edit3 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600" onClick={() => handleTest(pacs.id)}>
                    <RotateCw size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDelete(pacs.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {pacsList.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            <Database size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No PACS Servers Configured</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PACSManagement;
