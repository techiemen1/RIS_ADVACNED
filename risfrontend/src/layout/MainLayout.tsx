// src/layout/MainLayout.tsx
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";

export default function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "lg:pl-[80px]" : "lg:pl-[256px]"
          }`}
      >
        {/* Mobile Header to toggle sidebar */}
        <div className="lg:hidden flex items-center p-4 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-slate-600">
            <Menu />
          </button>
          <span className="ml-2 font-bold text-lg">iPacx RIS</span>
        </div>

        <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10 py-8 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

