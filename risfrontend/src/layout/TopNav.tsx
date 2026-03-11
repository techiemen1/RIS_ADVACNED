import { Link, useLocation } from "react-router-dom";
import { useRBAC } from "../context/RoleContext";
import { ChevronDown, LogOut, User, Settings as SettingsIcon, Hospital } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { label: "Dashboard", path: "/" },
  { label: "Patients", path: "/patients" },
  { label: "Schedule", path: "/schedule" },
  { label: "Orders", path: "/orders" },
  { label: "MWL", path: "/mwl" },
  { label: "PACS", path: "/pacs" },
  { label: "Reports", path: "/reports" },
  { label: "Billing", path: "/billing" },
  { label: "Settings", path: "/settings" },
];

export default function TopNav() {
  const { user, logout } = useRBAC();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="glass-nav px-6 flex items-center h-[64px] shadow-sm backdrop-blur-md bg-white/80 z-50">
      {/* Brand */}
      <div className="flex items-center gap-3 mr-10 relative group cursor-pointer">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10 relative z-10 border border-slate-700/50">
            <Hospital className="text-sky-400 w-5 h-5 drop-shadow-md" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight text-slate-900 leading-tight">
            RIS<span className="text-sky-600">-iPACX</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Radiology Intelligence</span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map(t => {
          const isActive = loc.pathname === t.path || (t.path !== "/" && loc.pathname.startsWith(t.path));
          return (
            <Link
              key={t.path}
              to={t.path}
              className={`
                relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap outline-none focus:ring-2 focus:ring-sky-200
                ${isActive ? "text-sky-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}
              `}
            >
              <div className="relative z-10">{t.label}</div>
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60 z-0"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="ml-auto relative">
        <button
          className="flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-white hover:shadow-md transition-all active:scale-95 group"
          onClick={() => setOpen(!open)}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white group-hover:ring-sky-100 transition-all">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col items-start mr-1">
            <span className="text-xs font-bold text-slate-700 leading-none max-w-[100px] truncate">{user.username}</span>
            <span className="text-[9px] font-medium text-slate-400 leading-none mt-0.5 capitalize">{user.role}</span>
          </div>
          <div className={`w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180 bg-sky-100 text-sky-600' : ''}`}>
            <ChevronDown size={12} />
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 glass-panel z-50 rounded-2xl origin-top-right overflow-hidden shadow-2xl ring-1 ring-black/5"
              >
                <div className="p-2 space-y-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors group"
                    onClick={() => setOpen(false)}
                  >
                    <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                      <User size={16} />
                    </div>
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors group"
                    onClick={() => setOpen(false)}
                  >
                    <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                      <SettingsIcon size={16} />
                    </div>
                    <span>Settings</span>
                  </Link>
                </div>

                <div className="h-px bg-slate-100 margin-x-2" />

                <div className="p-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group"
                  >
                    <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                      <LogOut size={16} />
                    </div>
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

