import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, Activity, CheckCircle, History, Zap, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
interface PacsStatus {
  name: string;
  status: 'online' | 'offline';
  last_connected: string | null;
}

interface DashboardStats {
  patients_today: number;
  studies_today: number;
  pending_reports: number;
  orders_today: number;
  revenue_today: number;
  avg_tat_hours: number;
  revenue_trend: { label: string; value: number }[];
  reporting_trend: { label: string; value: number }[];
  pacs_servers: PacsStatus[];
  critical_today?: number;
  ai_analyzed_today?: number;
}

const DEFAULT_STATS: DashboardStats = {
  patients_today: 0,
  studies_today: 0,
  pending_reports: 0,
  orders_today: 0,
  revenue_today: 0,
  avg_tat_hours: 0,
  revenue_trend: [],
  reporting_trend: [],
  pacs_servers: []
};



/* -------------------------------------------------
   ANIMATION VARIANTS
-------------------------------------------------- */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

/* -------------------------------------------------
   COMPONENTS
-------------------------------------------------- */
const StatCard = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
  <motion.div
    variants={itemVariants}
    className="premium-card !p-4 flex items-center justify-between group"
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "p-3 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm",
        `bg-${color}-500/10 text-${color}-600 border border-${color}-100/50`
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/analytics/dashboard');
      setStats(res.data || DEFAULT_STATS);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30s
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-sky-500 shadow-lg shadow-sky-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence <span className="text-sky-500">Hub</span></h1>
          </motion.div>
          <motion.p variants={itemVariants} className="text-sm font-medium text-slate-400 ml-12">
            Clinical insights and operational command center
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <span className="glass-panel px-3 py-1.5 rounded-full text-[10px] font-bold text-emerald-600 flex items-center gap-2 border-emerald-100/50 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            REAL-TIME SYNC ACTIVE
          </span>
        </motion.div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          title="Daily Patients"
          value={loading ? "..." : stats.patients_today}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Critical Cases"
          value={loading ? "..." : stats.critical_today || 0}
          icon={AlertTriangle}
          color={(stats.critical_today || 0) > 0 ? "rose" : "slate"}
        />
        <StatCard
          title="Reporting TAT"
          value={loading ? "..." : `${stats.avg_tat_hours}h`}
          icon={History}
          color="indigo"
        />
        <StatCard
          title="AI Insights"
          value={loading ? "..." : stats.ai_analyzed_today || 0}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Total Studies"
          value={loading ? "..." : stats.studies_today}
          icon={CheckCircle}
          color="sky"
        />
      </div>

      {/* ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="premium-card">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-800">Financial Growth (7D)</h3>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue_trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="premium-card">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-sky-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-800">Scan Volume Trends (7D)</h3>
            </div>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.reporting_trend}>
                <defs>
                  <linearGradient id="colorRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRep)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* HUD ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LOGS HUD */}
        <motion.div variants={itemVariants} className="premium-card flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Operational Pulse</h4>
          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
              <span className="text-sm font-medium text-slate-600">Active Worklist</span>
              <span className="text-sky-600 font-black text-lg">{stats.studies_today}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
              <span className="text-sm font-medium text-slate-600">Avg Reporting TAT</span>
              <span className="text-amber-600 font-black text-lg">{stats.avg_tat_hours}h</span>
            </div>
            <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100/50 text-xs text-sky-700 font-medium">
              System performance optimal. Clinical throughput is within peak parameters.
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="mt-8 text-[10px] font-black text-sky-600 uppercase tracking-widest hover:text-sky-800 transition-colors flex items-center justify-center gap-2 group"
          >
            Access Clinical Flow
            <Zap className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* INFRASTRUCTURE HUD */}
        <motion.div variants={itemVariants} className="premium-card flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Digital Infrastructure</h4>
            <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">RAID-ACTIVE</span>
          </div>
          <div className="space-y-6 flex-1">
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>PACS NODE STORAGE</span>
                <span className="text-emerald-500">74%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '74%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-emerald-500 h-full rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">AI</div>
              <div>
                <div className="text-xs font-black text-white">Synapse Intelligence</div>
                <div className="text-[10px] text-slate-400">Clinical Triage Engine Active</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/pacs')}
            className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 group"
          >
            Infrastructure Registry
            <Zap className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* CONNECTIVITY HUD */}
        <motion.div variants={itemVariants} className="premium-card flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Edge Imaging Nodes</h4>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] no-scrollbar">
            {stats.pacs_servers.length > 0 ? stats.pacs_servers.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 hover:bg-emerald-50/10 transition-all">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    p.status === 'online' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "bg-rose-500"
                  )}></span>
                  <div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.name}</div>
                    <div className="text-[9px] font-bold text-slate-400">{p.status === 'online' ? 'LIVE SYNC' : 'OFFLINE'}</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-sm">
                  {p.last_connected ? new Date(p.last_connected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-xs text-slate-400 font-semibold italic">NO ACTIVE NODES FOUND</p>
              </div>
            )}
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 tracking-widest">SYNC INTERVAL: 30S</span>
            <button
              onClick={() => navigate('/settings')}
              className="text-[9px] font-black text-sky-600 hover:text-sky-800 transition-colors"
            >MANAGE NETWORK</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
