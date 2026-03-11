import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Trash2, Plus, CheckCircle2, AlertCircle, Pencil, X, Activity, Server, ShieldCheck, Zap } from "lucide-react";

type Modality = {
    id: number;
    name: string;
    ae_title: string;
    ip_address: string;
    port: number;
    description: string;
    color: string;
};

export default function ModalitySettings() {
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState("");
    const [newAET, setNewAET] = useState("");
    const [newIP, setNewIP] = useState("");
    const [newPort, setNewPort] = useState(104);
    const [newColor, setNewColor] = useState("#3b82f6");

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Partial<Modality>>({});

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get("/modalities");
            setModalities(data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleAdd = async () => {
        if (!newName || !newAET || !newIP) {
            setError("Please fill all required fields (Name, AE Title, IP)");
            return;
        }
        setError(null);
        try {
            await axiosInstance.post("/modalities", {
                name: newName,
                ae_title: newAET,
                ip_address: newIP,
                port: newPort,
                color: newColor,
                description: "Added via Settings"
            });
            // Reset
            setNewName("");
            setNewAET("");
            setNewIP("");
            setNewPort(104);
            setError(null);
            setSuccessMsg("Modality added successfully");
            setTimeout(() => setSuccessMsg(null), 3000);
            load();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await axiosInstance.put(`/modalities/${editingId}`, editValues);
            setEditingId(null);
            setSuccessMsg("Modality updated successfully");
            setTimeout(() => setSuccessMsg(null), 3000);
            load();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure? This modality will no longer be able to query MWL.")) return;
        try {
            await axiosInstance.delete(`/modalities/${id}`);
            load();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-4">

            <div className="flex flex-col gap-6">
                {/* Compact Premium MWL Status Ribbon */}
                <div className="relative overflow-hidden group rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center gap-1">
                        {/* Status Label */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl m-0.5 flex-1">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">MWL Service Active</span>
                        </div>

                        {/* Stats Cluster */}
                        <div className="flex items-center gap-1 flex-[2]">
                            <div className="flex-1 flex items-center justify-between px-4 py-2 bg-slate-50/50 rounded-xl m-0.5 border border-transparent hover:border-slate-200 transition-colors">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AE Title</span>
                                <span className="text-[10px] font-mono font-bold text-blue-600">RIS_MWL</span>
                            </div>
                            <div className="flex-1 flex items-center justify-between px-4 py-2 bg-slate-50/50 rounded-xl m-0.5 border border-transparent hover:border-slate-200 transition-colors">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Port</span>
                                <span className="text-[10px] font-mono font-bold text-slate-900">11117</span>
                            </div>
                            <div className="hidden lg:flex flex-1 items-center justify-between px-4 py-2 bg-slate-50/50 rounded-xl m-0.5 border border-transparent hover:border-slate-200 transition-colors">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Uptime</span>
                                <span className="text-[10px] font-bold text-emerald-600">99.9%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Form */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Add New Modality</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
                                <AlertCircle size={12} /> {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded flex items-center gap-2">
                                <CheckCircle2 size={12} /> {successMsg}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Friendly Name</label>
                                <Input placeholder="e.g. CT Room 1" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">AE Title (Must Match Modality)</label>
                                <Input placeholder="e.g. CT_PHILIPS_1" value={newAET} onChange={e => setNewAET(e.target.value.toUpperCase())} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">IP Address</label>
                                <Input placeholder="e.g. 192.168.1.50" value={newIP} onChange={e => setNewIP(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Color Tag</label>
                                <div className="flex gap-2">
                                    <Input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-12 h-10 p-1" />
                                    <div className="flex gap-2 flex-1">
                                        <Input type="number" value={newPort} onChange={e => setNewPort(parseInt(e.target.value))} className="flex-1" />
                                        <Button onClick={handleAdd} disabled={loading} className="shrink-0">
                                            <Plus size={16} className="mr-2" /> Add
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Registered Modalities</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No.</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>AE Title</TableHead>
                                    <TableHead>IP / Port</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modalities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                                            No modalities configured.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modalities.map((m, i) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                                            <TableCell>
                                                {editingId === m.id ? (
                                                    <Input type="color" value={editValues.color} onChange={e => setEditValues({ ...editValues, color: e.target.value })} className="w-10 h-8 p-1" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: m.color || '#cbd5e1' }} />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {editingId === m.id ? (
                                                    <Input value={editValues.name} onChange={e => setEditValues({ ...editValues, name: e.target.value })} className="h-8 text-xs" />
                                                ) : m.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {editingId === m.id ? (
                                                    <Input value={editValues.ae_title} onChange={e => setEditValues({ ...editValues, ae_title: e.target.value.toUpperCase() })} className="h-8 text-xs w-32" />
                                                ) : (
                                                    <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">{m.ae_title}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 font-mono">
                                                {editingId === m.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input value={editValues.ip_address} onChange={e => setEditValues({ ...editValues, ip_address: e.target.value })} className="h-8 text-xs w-32" />
                                                        <span>:</span>
                                                        <Input type="number" value={editValues.port} onChange={e => setEditValues({ ...editValues, port: parseInt(e.target.value) })} className="h-8 text-xs w-16" />
                                                    </div>
                                                ) : (
                                                    `${m.ip_address}:${m.port}`
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {editingId === m.id ? (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleSaveEdit}>
                                                                <CheckCircle2 size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50" onClick={() => setEditingId(null)}>
                                                                <X size={14} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => { setEditingId(m.id); setEditValues(m); }}>
                                                                <Pencil size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
