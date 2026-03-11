// risfrontend/src/pages/Referrals/ReferralDashboard.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Users, TrendingUp, DollarSign, ShieldAlert, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import { cn } from "../../lib/utils";

export default function ReferralDashboard() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_pending: 0, total_settled: 0, active_doctors: 0 });

    const loadReferrals = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/referrals/ledger");
            setReferrals(res.data || []);

            // Calculate Stats
            const pending = res.data.reduce((sum: number, r: any) => r.settlement_status === 'PENDING' ? sum + parseFloat(r.incentive_amount) : sum, 0);
            const settled = res.data.reduce((sum: number, r: any) => r.settlement_status === 'PAID' ? sum + parseFloat(r.incentive_amount) : sum, 0);
            const doctors = new Set(res.data.map((r: any) => r.referring_doctor_id)).size;

            setStats({ total_pending: pending, total_settled: settled, active_doctors: doctors });
        } catch (e) {
            toast.error("Failed to load referral data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReferrals(); }, []);

    const handleSettle = async (doctorId: string, studyIds: string[]) => {
        try {
            await axiosInstance.post("/referrals/settle", { doctorId, studyIds });
            toast.success("Settlement processed successfully");
            loadReferrals();
        } catch (e) {
            toast.error("Settlement failed");
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-indigo-600" /> Referral & Incentive Hub
                </h1>
                <Button onClick={loadReferrals} variant="outline" size="sm">Refresh Data</Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-l-4 border-l-indigo-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Pending Settlements</p>
                                <h3 className="text-3xl font-bold text-slate-800">₹{stats.total_pending.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><DollarSign /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-emerald-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Paid</p>
                                <h3 className="text-3xl font-bold text-slate-800">₹{stats.total_settled.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Referring Doctors</p>
                                <h3 className="text-3xl font-bold text-slate-800">{stats.active_doctors}</h3>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-full text-orange-600"><Users /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Referral Ledger */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Referrals</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-6 py-3">Doctor</th>
                                    <th className="px-6 py-3">Patient / Study</th>
                                    <th className="px-6 py-3">Incentive</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Fraud Check</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {referrals.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-800">{r.doctor_name || "Dr. Self"}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{r.patient_name}</p>
                                            <p className="text-xs text-slate-400">{r.study_description}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">₹{r.incentive_amount}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                r.settlement_status === 'PAID' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                                            )}>
                                                {r.settlement_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {dayjs(r.created_at).format("DD MMM, YYYY")}
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.audit_log?.some((l: any) => l.fraud_flag) ? (
                                                <span className="flex items-center gap-1 text-red-500 font-bold text-xs">
                                                    <ShieldAlert size={14} /> Anomalous Volume
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">Verified</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {referrals.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No referral records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
