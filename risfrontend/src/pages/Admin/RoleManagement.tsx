// src/pages/Admin/RoleManagement.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Shield,
    Plus,
    Trash2,
    ChevronRight,
    Lock,
    Key,
    Users,
    Search,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { cn } from "../../lib/utils";
import PermissionsMatrix from "./Permissions"; // We will implement the matrix inside Permissions.tsx

interface Role {
    id: number;
    name: string;
    description: string;
    created_at?: string;
}

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRole, setNewRole] = useState({ name: "", description: "" });
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/roles");
            setRoles(res.data || []);
        } catch (err) {
            console.error("Fetch roles failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleAddRole = async () => {
        if (!newRole.name) return;
        try {
            await axiosInstance.post("/roles", newRole);
            setShowAddModal(false);
            setNewRole({ name: "", description: "" });
            fetchRoles();
        } catch (err) {
            alert("Failed to create role");
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <Shield className="w-8 h-8 text-indigo-600" />
                            ROLE ARCHITECTURE
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Define system access tiers and multi-site permissions.</p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-6 shadow-lg shadow-indigo-200 gap-2 font-bold uppercase tracking-widest text-xs transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Define New Role
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ROLE LIST */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search roles..."
                                className="pl-10 bg-white border-slate-200 rounded-xl h-12 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                                ))
                            ) : filteredRoles.length === 0 ? (
                                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No roles found</p>
                                </div>
                            ) : (
                                filteredRoles.map(role => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={cn(
                                            "p-5 bg-white rounded-2xl border transition-all cursor-pointer group hover:shadow-xl hover:shadow-indigo-500/5",
                                            selectedRole?.id === role.id
                                                ? "border-indigo-600 ring-4 ring-indigo-500/10 scale-[1.02]"
                                                : "border-slate-100 hover:border-indigo-200"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                    selectedRole?.id === role.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                                                )}>
                                                    <Lock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{role.name}</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Custom Tier</p>
                                                </div>
                                            </div>
                                            <ChevronRight className={cn("w-4 h-4 transition-transform", selectedRole?.id === role.id ? "text-indigo-600 translate-x-1" : "text-slate-300")} />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4 line-clamp-2 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">
                                            {role.description || "No description provided for this operational role."}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* PERMISSION MATRIX */}
                    <div className="lg:col-span-8">
                        {selectedRole ? (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                                            <Key className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedRole.name}</h2>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black tracking-widest uppercase">ID: {selectedRole.id}</span>
                                            </div>
                                            <p className="text-slate-500 text-sm font-medium mt-1">{selectedRole.description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    <PermissionsMatrix roleId={selectedRole.id} roleName={selectedRole.name} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center animate-in fade-in duration-700">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <Shield className="w-12 h-12 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Select a Role to Audit</h3>
                                <p className="text-slate-400 max-w-xs mt-2 text-sm">Pick a role from the left panel to configure its access matrix across the RIS/PACS ecosystem.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ADD ROLE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Plus className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Define Role</h2>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Name</label>
                                <Input
                                    value={newRole.name}
                                    onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                                    placeholder="e.g. RADIOLOGIST_SR"
                                    className="rounded-xl border-slate-200 h-12 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsibility Description</label>
                                <textarea
                                    className="w-full rounded-xl border-slate-200 p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all h-32 font-medium"
                                    value={newRole.description}
                                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    placeholder="Describe what this role manages within the system..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</Button>
                                <Button onClick={handleAddRole} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs">Register Role</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
