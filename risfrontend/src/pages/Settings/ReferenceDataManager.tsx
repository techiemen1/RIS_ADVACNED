// src/pages/Settings/ReferenceDataManager.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Trash2, Plus, Layers, Award, Info } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ReferenceDataManager() {
    const [departments, setDepartments] = useState<string[]>([]);
    const [designations, setDesignations] = useState<string[]>([]);
    const [newDept, setNewDept] = useState("");
    const [newDesig, setNewDesig] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const r = await axiosInstance.get("/settings");
            const data = r.data?.data || {};
            setDepartments(data["hierarchy.departments"] || []);
            setDesignations(data["hierarchy.designations"] || []);
        } catch (err) {
            console.error("Failed to load reference data", err);
        } finally {
            setLoading(false);
        }
    };

    const saveList = async (key: string, list: string[]) => {
        try {
            await axiosInstance.post("/settings", { key, value: list });
            toast.success("Hierarchy Updated");
            load();
        } catch (err) {
            toast.error("Cluster sync failed");
            console.error(err);
        }
    };

    const addDept = () => {
        if (!newDept.trim()) return;
        if (departments.includes(newDept.trim())) {
            toast.error("Protocol already exists");
            return;
        }
        const updated = [...departments, newDept.trim()];
        saveList("hierarchy.departments", updated);
        setNewDept("");
    };

    const removeDept = (idx: number) => {
        if (!window.confirm("Purge this department from registry? Existing users will drop to 'GLOBAL'.")) return;
        const updated = departments.filter((_, i) => i !== idx);
        saveList("hierarchy.departments", updated);
    };

    const addDesig = () => {
        if (!newDesig.trim()) return;
        if (designations.includes(newDesig.trim())) {
            toast.error("Designation already exists");
            return;
        }
        const updated = [...designations, newDesig.trim()];
        saveList("hierarchy.designations", updated);
        setNewDesig("");
    };

    const removeDesig = (idx: number) => {
        if (!window.confirm("Purge this designation?")) return;
        const updated = designations.filter((_, i) => i !== idx);
        saveList("hierarchy.designations", updated);
    };

    return (
        <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg text-slate-900">
                            <Layers size={18} />
                        </div>
                        Clinical Hierarchy Architect
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-400 group cursor-help">
                        <Info size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Affects User Creation Dropdowns</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Departments Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <Layers size={14} className="text-amber-500" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Medical Departments</h3>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={newDept}
                                onChange={e => setNewDept(e.target.value)}
                                placeholder="e.g. RADIOLOGY"
                                className="font-bold text-xs uppercase"
                                onKeyDown={e => e.key === 'Enter' && addDept()}
                            />
                            <Button onClick={addDept} className="bg-slate-900 hover:bg-slate-800 h-10 w-10 p-0 rounded-xl">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {departments.length === 0 && <p className="text-slate-300 text-[10px] font-bold uppercase italic text-center py-8">NO DEPARTMENTS IN CLUSTER</p>}
                            {departments.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl group hover:border-amber-200 transition-all hover:shadow-md">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{d}</span>
                                    <button onClick={() => removeDept(i)} className="opacity-0 group-hover:opacity-100 text-red-100 hover:text-red-500 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Designations Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <Award size={14} className="text-amber-500" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Clinical Designations</h3>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                value={newDesig}
                                onChange={e => setNewDesig(e.target.value)}
                                placeholder="e.g. CONSULTANT"
                                className="font-bold text-xs uppercase"
                                onKeyDown={e => e.key === 'Enter' && addDesig()}
                            />
                            <Button onClick={addDesig} className="bg-slate-900 hover:bg-slate-800 h-10 w-10 p-0 rounded-xl">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {designations.length === 0 && <p className="text-slate-300 text-[10px] font-bold uppercase italic text-center py-8">NO DESIGNATIONS IN CLUSTER</p>}
                            {designations.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl group hover:border-amber-200 transition-all hover:shadow-md">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{d}</span>
                                    <button onClick={() => removeDesig(i)} className="opacity-0 group-hover:opacity-100 text-red-100 hover:text-red-500 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="mt-12 p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                        <Info size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black pointer-events-none text-white uppercase tracking-widest leading-none mb-1">Architect Note</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Changes made here are instantly available in the User Management system across the entire hospital cluster.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
