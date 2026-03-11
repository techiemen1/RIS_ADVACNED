import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import LoadingOverlay from "../../layout/LoadingOverlay";
import { useRBAC } from "../../context/RoleContext";

const ProfilePage: React.FC = () => {
    const { user } = useRBAC();
    const [loading, setLoading] = useState(false);
    const [signatureLoading, setSignatureLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        designation: "",
        registration_number: "",
        password: "",
        signature_path: ""
    });

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            if (!user?.id) return;
            const res = await axiosInstance.get(`/users/${user.id}`);
            const data = res.data;
            setForm({
                full_name: data.full_name || "",
                email: data.email || "",
                phone_number: data.phone_number || "",
                designation: data.designation || "",
                registration_number: data.registration_number || "",
                password: "",
                signature_path: data.signature_path || ""
            });
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            setMessage(null);

            const payload: any = {
                full_name: form.full_name,
                email: form.email,
                phone_number: form.phone_number,
                designation: form.designation,
                registration_number: form.registration_number
            };

            if (form.password) {
                payload.password = form.password;
            }

            await axiosInstance.put(`/users/${user?.id}`, payload);
            setMessage("✅ Profile updated successfully.");

            // Clear password field
            setForm(prev => ({ ...prev, password: "" }));
        } catch (err: any) {
            console.error(err);
            setMessage(`❌ Update failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSignatureUpload = async (file?: File) => {
        if (!file || !user?.id) return;

        const fd = new FormData();
        fd.append("signature", file);

        try {
            setSignatureLoading(true);
            const res = await axiosInstance.post(`/users/${user.id}/signature`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setMessage("✅ Signature uploaded.");
            setForm(prev => ({ ...prev, signature_path: res.data.path }));
        } catch (err: any) {
            console.error("signature upload", err);
            setMessage(`❌ Failed to upload signature: ${err.response?.data?.error || err.message}`);
        } finally {
            setSignatureLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in relative">
            {loading && <LoadingOverlay message="Saving Profile..." />}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">My Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your personal information and digital credentials.</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-lg overflow-hidden">
                    {/* Placeholder for small avatar in header if needed */}
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                        {user?.username?.substring(0, 2).toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Personal Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="premium-card">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">👤</div>
                            <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5 gray-100 p-3 rounded-lg border border-dashed border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
                                    <div className="font-mono text-sm font-bold text-slate-700">{user?.username}</div>
                                </div>
                                <div className="space-y-1.5 gray-100 p-3 rounded-lg border border-dashed border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
                                    <div className="font-mono text-sm font-bold text-slate-700 uppercase">{user?.role}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input placeholder="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="medical-input" />
                                <Input placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="medical-input" />
                                <Input placeholder="Phone Number" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="medical-input" />
                                <Input
                                    type="password"
                                    placeholder="New Password (Optional)"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="medical-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Professional & Signature */}
                <div className="space-y-6">
                    <div className="premium-card bg-gradient-to-b from-white to-slate-50 border-blue-100/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4"></div>

                        <div className="flex items-center gap-2 mb-6 relative">
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold shadow-lg shadow-blue-500/20">Authorized</span>
                        </div>

                        <div className="space-y-4 relative">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Designation</label>
                                <Input
                                    placeholder="e.g. Consultant Radiologist"
                                    value={form.designation}
                                    onChange={e => setForm({ ...form, designation: e.target.value })}
                                    className="medical-input text-sm border-blue-100 focus:border-blue-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Registration No.</label>
                                <Input
                                    placeholder="e.g. KMC-12345"
                                    value={form.registration_number}
                                    onChange={e => setForm({ ...form, registration_number: e.target.value })}
                                    className="medical-input text-sm font-mono border-blue-100 focus:border-blue-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="premium-card">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">✍️</div>
                            <h3 className="text-sm font-bold text-slate-700">Digital Signature</h3>
                        </div>

                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] relative group hover:border-indigo-300 transition-colors">
                            {form.signature_path ? (
                                <img src={`/api${form.signature_path}`} alt="Signature" className="max-w-full max-h-[100px] object-contain filter drop-shadow-sm" />
                            ) : (
                                <div className="text-center">
                                    <span className="text-2xl opacity-20">✒️</span>
                                    <p className="text-xs text-slate-400 mt-2">No signature uploaded</p>
                                </div>
                            )}

                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm transition-all rounded-xl">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full shadow-sm">Change Signature</span>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => handleSignatureUpload(e.target.files?.[0])}
                                    disabled={signatureLoading}
                                    className="hidden"
                                />
                            </label>
                            {signatureLoading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                    <span className="animate-spin text-indigo-600">⟳</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 text-center leading-tight">
                            Recommended: Transparent PNG, high resolution.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button onClick={handleUpdate} className="btn-premium-primary w-40 h-11 text-base shadow-xl shadow-blue-900/10">
                    Save Changes
                </Button>
            </div>

            {message && (
                <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl animate-slide-up flex items-center gap-3 z-50 ${message.includes("failed") ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-900 text-emerald-50 border border-emerald-800"}`}>
                    <span className="text-xl">{message.includes("failed") ? "❌" : "✅"}</span>
                    <span className="font-medium">{message.replace(/✅|❌/g, '').trim()}</span>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
