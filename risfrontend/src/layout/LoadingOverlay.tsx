import * as React from "react";
import { cn } from "../lib/utils";

interface LoadingOverlayProps {
  message?: string;
  fullscreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  fullscreen = true,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-white/80 z-50",
        fullscreen ? "fixed inset-0" : "absolute inset-0"
      )}
    >
      <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/40 shadow-xl">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-4 border-sky-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent shadow-glow"></div>
        </div>
        <p className="text-sm text-slate-700 font-bold tracking-wide animate-pulse">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;

