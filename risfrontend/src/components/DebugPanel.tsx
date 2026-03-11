// src/components/DebugPanel.tsx
import React, { useState, useEffect } from "react";
import { useRBAC } from "../context/RoleContext";
import { motion, AnimatePresence } from "framer-motion";

const DebugPanel: React.FC = () => {
  const { user, isAuthenticated } = useRBAC();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const token = localStorage.getItem("token");

  // 🕒 auto-refresh every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  if (import.meta.env.MODE === "production") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 1000,
        fontFamily: "Inter, sans-serif",
        textAlign: "left",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "999px",
          padding: "6px 14px",
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
      >
        {open ? "Hide Debug" : "Show Debug"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: "8px",
              backgroundColor: "#1f2937",
              color: "#f9fafb",
              borderRadius: "8px",
              padding: "10px 14px",
              width: "260px",
              fontSize: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            <strong>🔍 Debug Info</strong>
            <hr style={{ borderColor: "rgba(255,255,255,0.2)" }} />

            <p>
              <strong>Status:</strong>{" "}
              <span style={{ color: isAuthenticated ? "#10b981" : "#ef4444" }}>
                {isAuthenticated ? "Authenticated ✅" : "Not Authenticated ❌"}
              </span>
            </p>

            <p>
              <strong>User:</strong>{" "}
              {user ? user.username : <span style={{ color: "#9ca3af" }}>None</span>}
            </p>

            <p>
              <strong>Role:</strong>{" "}
              {user?.role ? user.role : <span style={{ color: "#9ca3af" }}>—</span>}
            </p>

            <p>
              <strong>Token:</strong>{" "}
              {token ? token.slice(0, 25) + "..." : <span style={{ color: "#9ca3af" }}>None</span>}
            </p>

            <p>
              <strong>Time:</strong> {now.toLocaleTimeString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugPanel;
