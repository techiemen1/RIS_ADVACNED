// src/layout/Loader.tsx
import React from "react";

const Loader: React.FC = () => (
  <div className="flex justify-center items-center h-full w-full">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
      <div className="w-12 h-12 border-4 border-sky-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent shadow-lg shadow-sky-500/20"></div>
    </div>
  </div>
);

export default Loader;

