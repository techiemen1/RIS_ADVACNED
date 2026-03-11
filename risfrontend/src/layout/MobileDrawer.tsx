// src/layout/MobileDrawer.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Settings, ShieldCheck } from "lucide-react";

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tabs: { label: string; path: string; icon?: React.ReactNode }[];
    user: any;
    onLogout: () => void;
}

export default function MobileDrawer({ isOpen, onClose, tabs, user, onLogout }: MobileDrawerProps) {
    const loc = useLocation();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-[300px] bg-white shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                                    <ShieldCheck className="text-white w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 leading-tight">iPACX</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Clinical Hub v3.5</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm rounded-full text-slate-400 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Nav Links */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {tabs.map((t) => {
                                const isActive = loc.pathname === t.path || (t.path !== '/' && loc.pathname.startsWith(t.path));
                                return (
                                    <Link
                                        key={t.path}
                                        to={t.path}
                                        onClick={onClose}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border ${isActive
                                                ? "bg-orange-50 border-orange-100 text-orange-600 font-bold"
                                                : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className="text-sm uppercase tracking-wide">{t.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Footer / User */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black">
                                    {user.username?.[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{user.username}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Link to="/settings" onClick={onClose} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:border-slate-300 transition-all">
                                    <Settings size={14} /> Settings
                                </Link>
                                <button
                                    onClick={() => { onLogout(); onClose(); }}
                                    className="flex items-center justify-center gap-2 py-3 bg-white border border-red-100 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 transition-all"
                                >
                                    <LogOut size={14} /> Logout
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
