import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRBAC } from "../context/RoleContext";
import axiosInstance from "../services/axiosInstance";

import {
  LayoutDashboard,
  CalendarClock,
  Scan,
  FileText,
  Receipt,
  Boxes,
  ClipboardList,
  Settings,
  ServerCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Users
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const { user, logout } = useRBAC();
  const location = useLocation();

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    localStorage.getItem("adminSelectedBranch") || ""
  );

  useEffect(() => {
    // Only fetch for admins / supervisors
    if (user?.role === "admin") {
      axiosInstance.get("/branches")
        .then((res) => {
          if (res.data?.data) setBranches(res.data.data);
        })
        .catch((err) => console.log("Branch fetch error:", err));
    }
  }, [user]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranchId(val);
    if (val) {
      localStorage.setItem("adminSelectedBranch", val);
    } else {
      localStorage.removeItem("adminSelectedBranch");
    }
    window.location.reload(); // Hard reload to re-fetch all data with new interceptor header
  };

  if (!user) return null;

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["admin", "technologist", "radiologist", "staff"] },
    { name: "Appointments", icon: CalendarClock, path: "/appointments", roles: ["admin", "technologist", "radiologist", "staff"] },
    { name: "PACS", icon: Scan, path: "/pacs", roles: ["admin", "radiologist"] },
    { name: "Reports", icon: FileText, path: "/reports", roles: ["admin", "radiologist"] },
    { name: "Billing", icon: Receipt, path: "/billing", roles: ["admin", "staff"] },
    { name: "Inventory", icon: Boxes, path: "/inventory", roles: ["admin", "technologist"] },
    { name: "MWL", icon: ClipboardList, path: "/mwl", roles: ["admin", "technologist", "radiologist"] },
    { name: "Referral Hub", icon: Users, path: "/referrals", roles: ["admin", "staff"] },
    { name: "PACS Admin", icon: ServerCog, path: "/admin/pacs", roles: ["admin"] },
    { name: "Settings", icon: Settings, path: "/settings", roles: ["admin"] },
  ];

  const isActive = (path: string) =>
    location.pathname.startsWith(path);

  return (
    <>
      {/* BACKDROP FOR MOBILE */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 bg-blue-900 text-white flex flex-col
          transition-all duration-300
          ${collapsed ? "w-[80px]" : "w-[256px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          <div className="text-lg font-semibold">{collapsed ? "iR" : "iPacx RIS"}</div>

          {/* Collapse (desktop only) */}
          <button
            className="hidden lg:block p-1 hover:bg-blue-800/40 rounded"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* CLOSE MOBILE */}
          <button
            className="lg:hidden p-1 hover:bg-blue-800/40 rounded"
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        {/* BRANCH SELECTOR FOR ADMINS */}
        {!collapsed && user?.role === "admin" && branches.length > 0 && (
          <div className="px-4 py-3 border-b border-blue-800/50 bg-blue-900/50">
            <label className="block text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">
              Active Network Branch
            </label>
            <select
              className="w-full bg-blue-950 border border-blue-700 text-xs font-bold text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500"
              value={selectedBranchId}
              onChange={handleBranchChange}
            >
              <option value="">HQ & Entire Network</option>
              {branches.map(b => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {menu.filter(m => m.roles.includes(user.role)).map(m => {
            const Icon = m.icon;
            return (
              <Link
                key={m.path}
                to={m.path}
                className={`
                  flex items-center gap-3 p-2 mb-1 rounded text-sm
                  ${isActive(m.path)
                    ? "bg-blue-800/80 shadow"
                    : "hover:bg-blue-800/50"}
                `}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} />
                {!collapsed && <span>{m.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER ALWAYS SHOWS LOGOUT */}
        <div className="p-4 border-t border-blue-800">
          {!collapsed && (
            <>
              <p className="font-semibold">{user.full_name || user.username}</p>
              <p className="text-xs text-blue-200 mb-2">{user.role}</p>
            </>
          )}

          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 p-2 rounded flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            {!collapsed && "Logout"}
          </button>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;

