// src/pages/Auth/Login.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRBAC } from "../../context/RoleContext";
import axiosInstance from "../../services/axiosInstance";
import { Shield, Key, Chrome, Globe, Radio, TrendingUp, Info } from "lucide-react";

// Minimalist News Ticker Component
const NewsTicker: React.FC = () => {
  const [news, setNews] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Fallback news
    const localNews = [
      "New AI-driven CT protocols now active in Wing B.",
      "DICOM 3.0 update scheduled for weekend maintenance.",
      "Staff Meeting: Modernizing report turnaround times @ 4PM.",
      "Security Alert: Ensure two-factor authentication is active."
    ];

    if (isOnline) {
      // Simulate fetching live radiology news or use a public feed
      setNews([
        "BREAKING: RSNA 2026 highlights shifts in Deep Learning for MRI.",
        "Clinical insight: New contrast agents reduce side-effect profiles by 15%.",
        "Market watch: Global digital radiology market hits new peak in Q1.",
        "Resource: Updated guidelines for pediatric radiation safety released."
      ]);
    } else {
      setNews(localNews);
    }

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [isOnline]);

  return (
    <div className="w-full bg-slate-900 overflow-hidden h-8 flex items-center border-y border-slate-800">
      <div className="flex items-center px-4 bg-amber-500 h-full text-[9px] font-black uppercase tracking-widest text-slate-900 z-10 shrink-0">
        <Radio size={12} className="mr-2 animate-pulse" />
        Clinical News
      </div>
      <div className="flex whitespace-nowrap animate-marquee">
        {news.map((item, i) => (
          <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mx-12 flex items-center">
            <TrendingUp size={10} className="mr-2 text-amber-500/50" />
            {item}
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {news.map((item, i) => (
          <span key={`dup-${i}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mx-12 flex items-center">
            <TrendingUp size={10} className="mr-2 text-amber-500/50" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setUser } = useRBAC();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`🔑 [Login] Attempting login for user: ${username}`);
    setError(null);
    setLoading(true);

    try {
      console.log(`📡 [Login] Calling API at: ${axiosInstance.defaults.baseURL}/auth/login`);
      const res = await axiosInstance.post("/auth/login", { username, password });
      console.log("✅ [Login] Success!", res.data);
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      navigate("/");
    } catch (err: any) {
      console.error("❌ [Login] Error:", err.response?.data || err.message);
      let errorMessage = err.response?.data?.error || err.message || "Login failed";
      if (err.response?.data?.details) {
        errorMessage = `${errorMessage}: ${err.response.data.details}`;
      }
      if (err.message === "Network Error") {
        errorMessage = "Backend node unreachable. Check if server is running at " + axiosInstance.defaults.baseURL;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 selection:bg-amber-500 selection:text-slate-900 overflow-hidden relative">

      {/* Dynamic Aura Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-500/5 rounded-full blur-[100px]" />
      </div>

      <NewsTicker />

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-3xl mb-6 shadow-2xl">
              <Shield size={32} className="text-amber-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center justify-center gap-2">
              iPacx<span className="text-amber-500">RIS</span>
            </h1>
            <p className="text-[10px] font-black text-amber-500 tracking-[0.4em] uppercase mt-2">Architect DEBUG Mode</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/50 backdrop-blur-3xl p-8 rounded-[40px] border border-white/5 shadow-3xl space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black text-red-500 uppercase tracking-widest text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors">
                  <Globe size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-12 pr-4 py-4 rounded-2xl text-xs font-black tracking-widest focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-12 pr-4 py-4 rounded-2xl text-xs font-black tracking-widest focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Connect Study Center
                  <Chrome size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest pt-2">
              <span className="cursor-help hover:text-slate-300 transition-colors">Secured by DICOM TLS</span>
              <span className="cursor-help hover:text-slate-300 transition-colors">V 2.4.0</span>
            </div>
          </form>

          <div className="mt-12 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> HL7 Sync Active</span>
            <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-500" /> PACX Gateway Ready</span>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 relative z-10 flex items-center justify-between pointer-events-none">
        <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Info size={12} className="text-slate-800" />
          Unauthorized access strictly prohibited & monitored
        </div>
        <button
          onClick={() => alert(`Base URL: ${axiosInstance.defaults.baseURL}`)}
          className="pointer-events-auto text-[9px] font-black text-slate-700 uppercase tracking-widest hover:text-amber-500 transition-colors"
        >
          Diagnostics
        </button>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default Login;
