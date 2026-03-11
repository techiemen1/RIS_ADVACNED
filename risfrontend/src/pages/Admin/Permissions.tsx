// src/pages/Admin/Permissions.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import {
    Check,
    X,
    Settings,
    FileText,
    Database,
    CreditCard,
    Package,
    UserCircle,
    AlertCircle,
    Save,
    ShieldCheck
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { toast } from "react-hot-toast";

interface PermissionsMatrixProps {
    roleId: number;
    roleName: string;
}

const MODULES = [
    { id: "REPORTS", name: "Report Management", icon: FileText, color: "text-blue-600" },
    { id: "PACS", name: "PACS / Viewer", icon: Database, color: "text-indigo-600" },
    { id: "BILLING", name: "Financial / Billing", icon: CreditCard, color: "text-emerald-600" },
    { id: "INVENTORY", name: "Supply / Inventory", icon: Package, color: "text-amber-600" },
    { id: "ADMIN", name: "System Settings", icon: Settings, color: "text-red-600" },
    { id: "PATIENTS", name: "Patient Records", icon: UserCircle, color: "text-purple-600" },
];

const PERMISSION_TYPES = [
    { id: "READ", label: "Read Access" },
    { id: "WRITE", label: "Write Access" },
    { id: "DELETE", label: "Delete Capability" },
    { id: "APPROVE", label: "Approval Authority" },
];

const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({ roleId, roleName }) => {
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        // In a real app, we would fetch existing permissions for this role
        // For now, initializing with empty state or mock data
        setPermissions({});
    }, [roleId]);

    const togglePermission = async (module: string, type: string) => {
        const key = `${module}-${type}`;
        setSaving(key);
        try {
            // Logic: If already has it, we might want to "remove" it. 
            // But our backend 'setPermission' is an UPSERT (DO NOTHING on conflict).
            // For this implementation, we will treat it as a "Grant Permission" action.

            await axiosInstance.post("/roles/permissions", {
                role_id: roleId,
                module_name: module,
                permission: type
            });

            setPermissions(prev => {
                const current = prev[module] || [];
                if (current.includes(type)) return prev; // Already exists
                return {
                    ...prev,
                    [module]: [...current, type]
                };
            });

            toast.success(`Granted ${type} to ${module}`, {
                style: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }
            });
        } catch (err) {
            console.error("Toggle permission failed", err);
            toast.error("Security update failed");
        } finally {
            setSaving(null);
        }
    };

    const hasPermission = (module: string, type: string) => {
        return permissions[module]?.includes(type);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Access Rights Matrix</h3>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-indigo-600" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Authorized</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm border border-slate-200 bg-white" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Restricted</span>
                    </div>
                </div>
            </div>

            <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 italic">Core Modules</th>
                            {PERMISSION_TYPES.map(type => (
                                <th key={type.id} className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                    {type.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {MODULES.map(module => (
                            <tr key={module.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform", module.color)}>
                                            <module.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{module.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{module.id} Internal</div>
                                        </div>
                                    </div>
                                </td>
                                {PERMISSION_TYPES.map(type => {
                                    const active = hasPermission(module.id, type.id);
                                    const isProcessing = saving === `${module.id}-${type.id}`;

                                    return (
                                        <td key={type.id} className="p-6 text-center border-l border-slate-50/50">
                                            <button
                                                onClick={() => togglePermission(module.id, type.id)}
                                                disabled={isProcessing}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all shadow-sm active:scale-90",
                                                    active
                                                        ? "bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-500/10"
                                                        : "bg-white border-2 border-slate-100 text-slate-200 hover:border-indigo-200 hover:text-indigo-400"
                                                )}
                                            >
                                                {isProcessing ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : active ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <X className="w-5 h-5 opacity-20" />
                                                )}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4 mt-8">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Security Advisory</h4>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-1">
                        Updates to the permission matrix take effect <b>immediately</b> for all users assigned to this role.
                        Ensure you have audited the organizational site-specific overlap before granting "DELETE" capabilities.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PermissionsMatrix;
