import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AlertCircle, FileText, CheckCircle, Sparkles, Languages, Hospital, Zap, Receipt, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
};

export default function PortalLanding() {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [translatedImpression, setTranslatedImpression] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [targetLang, setTargetLang] = useState("Hindi");
    const [patientSummary, setPatientSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

    const languages = ["Hindi", "Kannada", "Telugu", "Tamil", "Marathi", "Bengali"];

    const handleSummarize = async () => {
        if (!reportData?.findings) return;
        setSummarizing(true);
        try {
            const res = await axiosInstance.post("/ai/summarize", {
                text: `${reportData.findings}\n\nImpression: ${reportData.impression}`
            });
            if (res.data.success) {
                setPatientSummary(res.data.summary);
                toast.success("AI Analysis generated");
            }
        } catch (err) {
            console.error("Summary error", err);
            toast.error("AI summarization is currently busy.");
        } finally {
            setSummarizing(false);
        }
    };

    const handleTranslate = async () => {
        if (!reportData?.impression) return;
        setTranslating(true);
        try {
            const res = await axiosInstance.post("/ai/translate", {
                text: reportData.impression,
                language: targetLang
            });
            if (res.data.success) {
                setTranslatedImpression(res.data.translatedText);
                toast.success(`Translated to ${targetLang}`);
            }
        } catch (err) {
            console.error("Translation error", err);
            toast.error("AI translation service is currently busy.");
        } finally {
            setTranslating(false);
        }
    };

    useEffect(() => {
        const urlOtp = searchParams.get("otp");
        if (urlOtp && token) {
            handleVerify(urlOtp);
        }
    }, [token]);

    const handleVerify = async (manualOtp?: string) => {
        const code = manualOtp || otp;
        if (!code) return;

        setLoading(true);
        setError(null);
        try {
            const res = await axiosInstance.get(`/patient/portal/view/${token}`, {
                params: { otp: code }
            });
            setReportData(res.data.data);

            // Check payment status
            const payCheck = await axiosInstance.get(`/payments/status/${res.data.data.study_instance_uid}`);
            setIsPaid(payCheck.data.paid);
            if (payCheck.data.paid) {
                // We'd ideally need the order_id for the invoice download
                // For now, let's assume we can fetch the latest successful order_id
                setPaymentOrderId(payCheck.data.orderId || null);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Verification failed. Please check your OTP.");
        } finally {
            setLoading(false);
        }
    };

    const initCheckout = async () => {
        if (!reportData) return;
        setVerifyingPayment(true);
        try {
            const orderRes = await axiosInstance.post("/payments/create-order", {
                studyUID: reportData.study_instance_uid,
                amount: 500,
                patientEmail: reportData.email || "patient@example.com"
            });

            if (!orderRes.data.success) throw new Error("Order creation failed");

            const { orderId, keyId, amount } = orderRes.data;
            setPaymentOrderId(orderId);

            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => {
                const rzp = new (window as any).Razorpay({
                    key: keyId,
                    amount: amount,
                    currency: "INR",
                    name: "iPacx Intelligence Hub",
                    description: "Radiology Clinical Consultation Fee",
                    order_id: orderId,
                    handler: async (response: any) => {
                        toast.loading("Verifying transaction...", { id: 'v-pay' });
                        const verifyRes = await axiosInstance.post("/payments/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            setIsPaid(true);
                            toast.success("Payment Received. Report Unlocked!", { id: 'v-pay' });
                        }
                    },
                    prefill: { email: reportData.email || "" },
                    theme: { color: "#0ea5e9" }
                });
                rzp.open();
            };
            document.body.appendChild(script);

        } catch (err) {
            console.error("Payment init error", err);
            setError("Payment gateway is temporarily unavailable. Please try again later.");
        } finally {
            setVerifyingPayment(false);
        }
    };

    if (reportData) {
        if (!isPaid) {
            return (
                <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 font-sans selection:bg-sky-100">
                    <motion.div
                        initial="hidden" animate="visible" variants={containerVariants}
                        className="w-full max-w-lg mx-auto my-auto"
                    >
                        {/* Brand */}
                        <motion.div variants={itemVariants} className="flex justify-center items-center gap-3 mb-12">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20 rotate-3">
                                <Hospital className="text-white w-7 h-7" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">RIS<span className="text-sky-500">-iPACX</span></h1>
                        </motion.div>

                        <motion.div variants={itemVariants} className="premium-card !p-0 overflow-hidden border-none shadow-2xl shadow-sky-900/10">
                            <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse"></div>

                            <div className="p-8 space-y-8">
                                <div className="text-center">
                                    <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-600 border border-amber-100/50 shadow-inner">
                                        <ShieldCheck size={40} className="drop-shadow-sm" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Locked Report</h2>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        Clinical fees of <span className="text-slate-900 font-bold">₹500.00</span> (Incl. GST) is pending for your {reportData.modality} Scan.
                                    </p>
                                </div>

                                <div className="glass-panel !bg-slate-50/50 !p-6 rounded-2xl border-slate-200/60 overflow-hidden relative">
                                    <div className="flex justify-between items-center relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxable Service</p>
                                            <p className="text-sm font-bold text-slate-700">Radiology Consultation</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">₹500.00</p>
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">INR (₹)</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                </div>

                                <button
                                    onClick={initCheckout}
                                    disabled={verifyingPayment}
                                    className="btn-premium w-full py-5 rounded-2xl text-lg flex items-center justify-center gap-3 overflow-hidden group relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative z-10 flex items-center gap-3">
                                        {verifyingPayment ? (
                                            <>
                                                <Zap className="w-5 h-5 animate-spin" />
                                                Initializing Gateway...
                                            </>
                                        ) : (
                                            <>
                                                <Receipt className="w-6 h-6" />
                                                Complete Payment
                                            </>
                                        )}
                                    </span>
                                </button>

                                <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    SECURED BY RAZORPAY • 256-BIT ENCRYPTION
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-50/30 flex flex-col font-sans selection:bg-sky-100">
                <motion.div
                    initial="hidden" animate="visible" variants={containerVariants}
                    className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8"
                >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/60">
                        <motion.div variants={itemVariants}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                                    <FileText className="text-white w-5 h-5" />
                                </div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Radiology <span className="text-sky-500">Report</span></h1>
                            </div>
                            <p className="text-xs font-bold text-slate-400 ml-11 uppercase tracking-widest">Digital Clinical Insight • Verified Link</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex gap-4">
                            <div className="glass-panel !bg-emerald-50/50 !px-4 !py-2 rounded-xl flex items-center gap-3 border-emerald-100/50 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Paid & Authenticated</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            <motion.div variants={itemVariants} className="premium-card space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Zap className="text-sky-500 w-5 h-5" />
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Radiological Findings</h3>
                                </div>
                                <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                    {reportData.findings || "Findings pending clinician finalization."}
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="premium-card !bg-sky-500/5 !border-sky-500/10 space-y-6">
                                <div className="flex items-center gap-3 border-b border-sky-500/10 pb-4">
                                    <Hospital className="text-sky-600 w-5 h-5" />
                                    <h3 className="text-[11px] font-black text-sky-900 uppercase tracking-widest">Clinical Impression</h3>
                                </div>
                                <div className="text-sky-900 font-bold text-lg leading-relaxed whitespace-pre-wrap">
                                    {reportData.impression || "Awaiting final impression."}
                                </div>
                            </motion.div>

                            {/* AI & Translation */}
                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass-panel !p-6 rounded-2xl border-indigo-100 shadow-xl shadow-indigo-500/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-indigo-600" />
                                            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Explain in Plain English</h4>
                                        </div>
                                    </div>
                                    {patientSummary ? (
                                        <div className="text-sm text-indigo-900 leading-relaxed font-bold animate-in fade-in zoom-in-95">
                                            {patientSummary}
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase py-5 rounded-xl transition-all"
                                            onClick={handleSummarize}
                                            disabled={summarizing}
                                        >
                                            {summarizing ? "Analysing Findings..." : "Generate AI Summary"}
                                        </Button>
                                    )}
                                </div>

                                <div className="glass-panel !p-6 rounded-2xl border-sky-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Languages size={16} className="text-sky-600" />
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Regional Translation</h4>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {!translatedImpression ? (
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-2 focus:ring-sky-500"
                                                    value={targetLang}
                                                    onChange={(e) => setTargetLang(e.target.value)}
                                                >
                                                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                                <Button
                                                    className="bg-sky-500 hover:bg-sky-600 text-white font-black text-[11px] uppercase h-10 rounded-xl"
                                                    onClick={handleTranslate}
                                                    disabled={translating}
                                                >
                                                    {translating ? "..." : "Go"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-sky-900 font-bold bg-white p-3 rounded-xl border border-sky-100 animate-in slide-in-from-top-2">
                                                {translatedImpression}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <motion.div variants={itemVariants} className="premium-card space-y-6">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Patient File</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                                            <p className="text-sm font-black text-slate-800">{reportData.first_name} {reportData.last_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Modality</p>
                                            <p className="text-sm font-black text-sky-600 uppercase italic tracking-wider">{reportData.modality}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accession #</p>
                                            <p className="text-[11px] font-mono font-black text-slate-600">{reportData.accession_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clinic ID</p>
                                            <p className="text-[11px] font-mono font-black text-slate-600">PN-{reportData.patient_id}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4">
                                <Button
                                    className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-2xl font-black text-sm gap-3 shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-1"
                                    onClick={() => window.print()}
                                >
                                    <FileText className="w-5 h-5" /> DOWNLOAD REPORT (PDF)
                                </Button>
                                {paymentOrderId && (
                                    <Button
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl font-black text-[11px] uppercase border-2 border-slate-200 text-slate-500 hover:bg-slate-50 gap-3"
                                        onClick={() => window.open(`${axiosInstance.defaults.baseURL}/payments/invoice/${paymentOrderId}`, '_blank')}
                                    >
                                        <Receipt className="w-4 h-4" /> Download GST Receipt
                                    </Button>
                                )}
                            </motion.div>

                            <motion.p variants={itemVariants} className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest px-4 leading-relaxed">
                                This secure link expires on {new Date(reportData.expires_at).toLocaleDateString()}. <br /> Keep your access code private.
                            </motion.p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 font-sans selection:bg-sky-100">
            <motion.div
                initial="hidden" animate="visible" variants={containerVariants}
                className="w-full max-w-md mx-auto my-auto"
            >
                <motion.div variants={itemVariants} className="flex justify-center items-center gap-3 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20 rotate-3">
                        <Hospital className="text-white w-7 h-7" />
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="premium-card border-none shadow-2xl shadow-sky-900/10">
                    <div className="text-center space-y-4 mb-8">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Patient <span className="text-sky-500">Portal</span></h2>
                        <p className="text-sm font-medium text-slate-500">Identify yourself with the 6-digit access code</p>
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-2xl border border-rose-100/50 mb-6">
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 text-left">Medical Access Code</label>
                            <Input
                                type="text"
                                placeholder="..."
                                className="medical-input h-16 text-center text-3xl font-mono tracking-[0.5em] focus:bg-white"
                                value={otp}
                                maxLength={6}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            />
                        </div>

                        <button
                            className="btn-premium w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-sky-500/20"
                            disabled={otp.length !== 6 || loading}
                            onClick={() => handleVerify()}
                        >
                            {loading ? "AUTHENTICATING..." : "VERIFY & OPEN"}
                        </button>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> SECURE SSL</span>
                        <span className="cursor-help hover:text-slate-600 transition">SUPPORT</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
