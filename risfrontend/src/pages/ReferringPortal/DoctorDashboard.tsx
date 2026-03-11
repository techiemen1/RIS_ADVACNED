import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Search, FileText, Clock, CheckCircle, ExternalLink, Calendar } from "lucide-react";
import toast from "react-hot-toast";

interface ReferralStudy {
    studyUID: string;
    patientName: string;
    patientID: string;
    modality: string;
    date: string;
    reportStatus: "pending" | "draft" | "final";
}

export default function DoctorDashboard() {
    const [studies, setStudies] = useState<ReferralStudy[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchStudies = async () => {
        try {
            const res = await axiosInstance.get("/referring/portal/studies");
            if (res.data.success) {
                setStudies(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch referrals", err);
            toast.error("Security check failed or network error.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudies();
    }, []);

    const filtered = studies.filter(s =>
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientID.includes(searchQuery)
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white"><FileText size={20} /></div>
                    Referring Physician Portal
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Track patient results and clinical imaging across the diagnostic network.</p>
            </div>

            {/* SEARCH BAR */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search patient name or ID..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchStudies}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
                >
                    Refresh Data
                </button>
            </div>

            {/* STUDIES LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Modality</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Scan Date</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Synchronising records...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No referral studies found matching your credentials.</td></tr>
                        ) : filtered.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 uppercase tracking-tight">{s.patientName}</div>
                                    <div className="text-[10px] text-slate-400 font-bold">ID: {s.patientID}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black">{s.modality}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                        <Calendar size={14} className="text-slate-400" />
                                        {s.date || "---"}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {s.reportStatus === 'final' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">
                                            <CheckCircle size={12} /> READY
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-100">
                                            <Clock size={12} /> IN PROGRESS
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {s.reportStatus === 'final' ? (
                                        <button
                                            onClick={() => window.open(`/reports/view/${s.studyUID}`, '_blank')}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                                        >
                                            View Report <ExternalLink size={12} />
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Awaiting Sign-off</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="mt-0.5 text-blue-500 font-bold">💡</div>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    <strong>Security Notice:</strong> You are authorized to view these records because you are listed as the primary referring physician.
                    Audit logs will record your access session. If you are missing a patient, please contact the diagnostic center's helpdesk.
                </p>
            </div>
        </div>
    );
}
