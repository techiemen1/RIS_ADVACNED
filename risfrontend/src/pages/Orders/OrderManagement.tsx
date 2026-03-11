import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../../services/axiosInstance';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
    FilePlus,
    Search,
    Clock,
    Globe,
    MoreHorizontal,
    Stethoscope,
    User,
    Zap,
    Target
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getModalityColors } from '../../utils/modalityColors';
import { getGenderColors } from "../../utils/genderColors";

export default function OrderManagement() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [query, setQuery] = useState("");
    const [searchParams] = useSearchParams();

    const [newOrder, setNewOrder] = useState({
        patient_id: '',
        modality: 'CT',
        procedure_code: '',
        procedure_description: '',
        clinical_indication: '',
        scheduled_time: '',
        priority: 'ROUTINE',
        referral_source: '',
        is_tele_radiology: false,
        accession_number: '',
        body_part: '',
        scan_type: ''
    });

    const [editingOrder, setEditingOrder] = useState<any>(null);

    const [patients, setPatients] = useState([]);
    const [modalities, setModalities] = useState<any[]>([]);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/orders');
            setOrders(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPatients = useCallback(async () => {
        try {
            const res = await axios.get('/patients?limit=100');
            const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setPatients(list);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const loadModalities = useCallback(async () => {
        try {
            const res = await axios.get('/modalities');
            const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setModalities(list.filter((m: any) => m && m.name));
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        loadOrders();
        loadPatients();
        loadModalities();
    }, [loadOrders, loadPatients, loadModalities]);

    useEffect(() => {
        const pid = searchParams.get('patient_id');
        if (pid) {
            setNewOrder(prev => ({ ...prev, patient_id: pid }));
            setShowModal(true);
        }
    }, [searchParams]);

    const filteredOrders = useMemo(() => {
        const q = query.toLowerCase();
        return orders.filter(o =>
            o?.accession_number?.toLowerCase().includes(q) ||
            o?.patient_name?.toLowerCase().includes(q) ||
            o?.modality?.toLowerCase().includes(q)
        );
    }, [orders, query]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOrder) {
                await axios.put(`/orders/${editingOrder.id}`, newOrder);
                toast.success("Order Updated Successfully");
            } else {
                await axios.post('/orders', newOrder);
                toast.success("Order Registered Successfully");
            }
            setShowModal(false);
            setEditingOrder(null);
            loadOrders();
        } catch (err) {
            console.error(err);
            toast.error(editingOrder ? "Failed to update order" : "Failed to create order");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            await axios.delete(`/orders/${id}`);
            toast.success("Order Deleted");
            loadOrders();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete order");
        }
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        setNewOrder({
            patient_id: order.patient_id,
            modality: order.modality,
            procedure_code: order.procedure_code || '',
            procedure_description: order.procedure_description || '',
            clinical_indication: order.clinical_indication || '',
            scheduled_time: order.scheduled_time ? new Date(order.scheduled_time).toISOString().slice(0, 16) : '',
            priority: order.priority || 'ROUTINE',
            referral_source: order.referral_source || '',
            is_tele_radiology: !!order.is_tele_radiology,
            accession_number: order.accession_number || '',
            body_part: order.body_part || '',
            scan_type: order.scan_type || ''
        });
        setShowModal(true);
    };

    // Get body parts for selected modality
    const activeModalityData = useMemo(() => {
        return modalities.find(m => m.name === newOrder.modality);
    }, [modalities, newOrder.modality]);

    const availableBodyParts = useMemo(() => {
        if (!activeModalityData?.body_parts) return [];
        try {
            const bp = typeof activeModalityData.body_parts === 'string' 
                ? JSON.parse(activeModalityData.body_parts) 
                : activeModalityData.body_parts;
            return bp || [];
        } catch (e) { return []; }
    }, [activeModalityData]);

    const activeBodyPartData = useMemo(() => {
        return availableBodyParts.find((bp: any) => bp.name === newOrder.body_part);
    }, [availableBodyParts, newOrder.body_part]);

    const availableScans = useMemo(() => {
        return activeBodyPartData?.scans || [];
    }, [activeBodyPartData]);

    const stats = {
        total: orders.length,
        scheduled: orders.filter(o => o?.status === 'SCHEDULED').length,
        stat: orders.filter(o => o?.priority === 'STAT').length,
        tele: orders.filter(o => !!o?.is_tele_radiology).length,
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans">
            {/* HUD HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Intake</p>
                        <h4 className="text-2xl font-black text-slate-800">{stats.total}</h4>
                    </div>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Target className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STAT Urgent</p>
                        <h4 className="text-2xl font-black text-rose-600">{stats.stat}</h4>
                    </div>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <Zap className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tele-Radiology</p>
                        <h4 className="text-2xl font-black text-emerald-600">{stats.tele}</h4>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Globe className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmed Slot</p>
                        <h4 className="text-2xl font-black text-blue-600">{stats.scheduled}</h4>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Accession, Patient, or Modality..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                    <FilePlus className="w-4 h-4" /> NEW EXAM ENTRY
                </button>
            </div>

            {/* HIGH-DENSITY TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Identity Info</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Clinical Modality</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Priority</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Indication & Referrer</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status / Timeline</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium italic">Synchronizing with registry...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium italic">No matching orders detected in the system.</td></tr>
                        ) : (
                            filteredOrders.map((o) => (
                                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border transition-colors",
                                                getGenderColors(o.patient_gender || o.gender).bg,
                                                getGenderColors(o.patient_gender || o.gender).text,
                                                getGenderColors(o.patient_gender || o.gender).border
                                            )}>
                                                {o.patient_name?.substring(0, 2)?.toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <div className="text-base font-black text-slate-800">{o.patient_name}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-tighter">
                                                        ACC: {o.accession_number}
                                                    </div>
                                                    {o.body_part && (
                                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                                                            {o.body_part} {o.scan_type ? `/ ${o.scan_type}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-black border tracking-wider",
                                                getModalityColors(o.modality).bg,
                                                getModalityColors(o.modality).text,
                                                getModalityColors(o.modality).border
                                            )}>
                                                {o.modality}
                                            </span>
                                            <span className="font-bold text-slate-600 truncate max-w-[150px]">{o.procedure_description || 'General Exam'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-widest border",
                                            o.priority === 'STAT' ? "bg-rose-50 border-rose-100 text-rose-600" :
                                                o.priority === 'URGENT' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                    "bg-slate-50 border-slate-100 text-slate-500"
                                        )}>
                                            {o.priority === 'STAT' && <Zap className="w-3 h-3 animate-pulse" />}
                                            {o.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700 max-w-[250px] line-clamp-1">{o.clinical_indication || 'No indication provided'}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Stethoscope className="w-4 h-4 text-slate-300" />
                                            <span className="text-xs text-slate-400 font-bold">{o.referral_source || 'Self Referral'}</span>
                                            {o.is_tele_radiology && (
                                                <span className="ml-2 px-1.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100 uppercase">External</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                o.status === 'SCHEDULED' ? 'bg-amber-400' :
                                                    o.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-400'
                                            )}></div>
                                            <span className="text-xs font-black text-slate-700 tracking-tight">{o.status}</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> {new Date(o.scheduled_time).toLocaleDateString()} {new Date(o.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEdit(o)}
                                                className="p-2 hover:bg-sky-50 rounded-xl transition-all text-slate-400 hover:text-sky-600 hover:shadow-sm"
                                                title="Edit Order"
                                            >
                                                <Zap className="w-4 h-4 fill-current" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(o.id)}
                                                className="p-2 hover:bg-rose-50 rounded-xl transition-all text-slate-400 hover:text-rose-600 hover:shadow-sm"
                                                title="Delete Order"
                                            >
                                                <Target className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODERN MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <FilePlus className="w-5 h-5 text-indigo-600" /> {editingOrder ? 'UPDATE CLINICAL EXAM' : 'CLINICAL EXAM ENTRY'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Target Patient profile</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-inner"
                                                value={newOrder.patient_id}
                                                onChange={e => setNewOrder({ ...newOrder, patient_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Search Patient Registry...</option>
                                                {patients.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.name} (MRN: {p.mrn || p.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical Modality</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.modality}
                                            onChange={e => setNewOrder({ ...newOrder, modality: e.target.value, body_part: '', scan_type: '' })}
                                        >
                                                <option value="">Select...</option>
                                                {modalities.map(m => (
                                                    <option key={m.id || m.name} value={m.name}>{m.name}</option>
                                                ))}
                                            {!modalities.length && ['CT', 'MR', 'CR', 'US', 'DX', 'MG'].map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Accession (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="AUTO-GENERATE"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.accession_number}
                                            onChange={e => setNewOrder({ ...newOrder, accession_number: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Target Body Part</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.body_part}
                                            onChange={e => setNewOrder({ ...newOrder, body_part: e.target.value, scan_type: '' })}
                                        >
                                            <option value="">Select Region...</option>
                                            {availableBodyParts.map((bp: any) => (
                                                <option key={bp.name} value={bp.name}>{bp.name}</option>
                                            ))}
                                            {!availableBodyParts.length && <option value="">No predefined regions</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Scan Protocol / Type</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.scan_type}
                                            onChange={e => setNewOrder({ ...newOrder, scan_type: e.target.value })}
                                            disabled={!newOrder.body_part}
                                        >
                                            <option value="">Select Protocol...</option>
                                            {availableScans.map((s: string) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                            {!availableScans.length && <option value="">No protocols defined</option>}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Exams Scheduled</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.scheduled_time}
                                            onChange={e => setNewOrder({ ...newOrder, scheduled_time: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Priority Triage</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.priority}
                                            onChange={e => setNewOrder({ ...newOrder, priority: e.target.value })}
                                        >
                                            <option value="ROUTINE">ROUTINE</option>
                                            <option value="URGENT">URGENT</option>
                                            <option value="STAT">STAT (CRITICAL)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Tele-Radiology Routing</label>
                                            <p className="text-[9px] text-slate-400 leading-none">Enable international/external reporting</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={newOrder.is_tele_radiology}
                                            onChange={e => setNewOrder({ ...newOrder, is_tele_radiology: e.target.checked })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Referral Source</label>
                                        <input
                                            type="text"
                                            placeholder="Doctor or Facility Name"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.referral_source}
                                            onChange={e => setNewOrder({ ...newOrder, referral_source: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Procedure Description</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CT Brain Plain"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            value={newOrder.procedure_description}
                                            onChange={e => setNewOrder({ ...newOrder, procedure_description: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical History / Indication</label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                        value={newOrder.clinical_indication}
                                        onChange={e => setNewOrder({ ...newOrder, clinical_indication: e.target.value })}
                                        placeholder="Enter clinical symptoms or reason for study..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors tracking-tighter shadow-sm">Cancel</button>
                                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl">Confirm & Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
