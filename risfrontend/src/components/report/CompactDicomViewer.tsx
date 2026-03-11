import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Maximize2,
    LayoutGrid,
    Sun,
    Move,
    Crosshair,
    Camera,
    Cpu,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Button } from "../ui/button";

interface CompactDicomViewerProps {
    studyUID: string;
    patientData?: any;
    onCapture?: (imageDataUrl: string) => void;
}

const MODALITIES: any = {
    CT: { presets: ["Lung", "Bone", "Mediastinum", "Soft Tissue"], color: "text-blue-400" },
    MRI: { presets: ["T1", "T2", "FLAIR", "DWI"], color: "text-purple-400" },
    XR: { presets: ["Standard", "Inverted"], color: "text-emerald-400" },
    DEFAULT: { presets: ["Standard", "High Contrast"], color: "text-slate-400" }
};

export const CompactDicomViewer: React.FC<CompactDicomViewerProps> = ({ studyUID, patientData, onCapture }) => {
    const [layout, setLayout] = useState("1x1");
    const [activeTool, setActiveTool] = useState("window");
    const [slice, setSlice] = useState(62);
    const [viewSettings, setViewSettings] = useState({ brightness: 100, contrast: 100, zoom: 1.2, pan: { x: 0, y: 0 } });
    const viewportRef = useRef<HTMLDivElement>(null);

    const modality = (patientData?.modality || "CT").toUpperCase();
    const presets = MODALITIES[modality]?.presets || MODALITIES.DEFAULT.presets;

    const handleInteraction = useCallback((e: React.MouseEvent) => {
        if (e.buttons !== 1) return;
        if (activeTool === "window") {
            setViewSettings(p => ({
                ...p,
                contrast: Math.max(50, p.contrast + e.movementX),
                brightness: Math.max(50, p.brightness - e.movementY)
            }));
        } else if (activeTool === "pan") {
            setViewSettings(p => ({ ...p, pan: { x: p.pan.x + e.movementX, y: p.pan.y + e.movementY } }));
        }
    }, [activeTool]);

    const applyPreset = (preset: string) => {
        const presetMap: any = {
            "Lung": { contrast: 180, brightness: 70 },
            "Bone": { contrast: 280, brightness: 110 },
            "Mediastinum": { contrast: 130, brightness: 90 },
            "Standard": { contrast: 100, brightness: 100 },
            "High Contrast": { contrast: 150, brightness: 90 }
        };
        if (presetMap[preset]) setViewSettings(p => ({ ...p, ...presetMap[preset] }));
    };

    const captureFinding = async () => {
        if (!viewportRef.current || !onCapture) return;

        // In a real implementation with Cornerstone/Canvas, we'd use .toDataURL()
        // For this simulation/UI build, we'll use a placeholder image to simulate capture
        // In production, this would be: const dataUrl = canvas.toDataURL("image/jpeg");
        const simulationUrl = "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=800";
        onCapture(simulationUrl);
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-slate-300 font-sans select-none overflow-hidden rounded-l-2xl border-r border-white/10 shadow-2xl">
            {/* Viewer Header */}
            <div className="h-12 bg-black border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/10 scale-90 origin-left">
                    <button onClick={() => setLayout("1x1")} className={`p-1.5 rounded transition-all ${layout === "1x1" ? "text-blue-500 bg-white/10" : "text-slate-600 hover:text-white"}`}><Maximize2 size={14} /></button>
                    <button onClick={() => setLayout("2x2")} className={`p-1.5 rounded transition-all ${layout === "2x2" ? "text-blue-500 bg-white/10" : "text-slate-600 hover:text-white"}`}><LayoutGrid size={14} /></button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button onClick={() => setActiveTool("window")} className={`p-1.5 rounded transition-all ${activeTool === "window" ? "text-blue-500 bg-white/10" : "text-slate-600 hover:text-white"}`}><Sun size={14} /></button>
                    <button onClick={() => setActiveTool("pan")} className={`p-1.5 rounded transition-all ${activeTool === "pan" ? "text-blue-500 bg-white/10" : "text-slate-600 hover:text-white"}`}><Move size={14} /></button>
                    <button onClick={() => setActiveTool("measure")} className={`p-1.5 rounded transition-all ${activeTool === "measure" ? "text-blue-500 bg-white/10" : "text-slate-600 hover:text-white"}`}><Crosshair size={14} /></button>
                </div>

                <button
                    onClick={captureFinding}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Camera size={14} /> Capture
                </button>
            </div>

            {/* Main Viewport */}
            <div className="flex-1 relative overflow-hidden flex bg-black" ref={viewportRef}>
                <div className={`flex-1 grid gap-0.5 p-0.5 ${layout === "1x1" ? "grid-cols-1" : "grid-cols-2 grid-rows-2"}`}>
                    {Array.from({ length: layout === "1x1" ? 1 : 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={`relative bg-black overflow-hidden flex items-center justify-center border border-white/5 ${i === 0 ? "ring-1 ring-blue-500/50 ring-inset" : ""}`}
                            onMouseMove={i === 0 ? handleInteraction : undefined}
                            onWheel={(e) => setSlice(s => Math.max(1, Math.min(120, s + (e.deltaY > 0 ? 1 : -1))))}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1200"
                                alt="DICOM"
                                className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-75"
                                style={{
                                    filter: `brightness(${viewSettings.brightness}%) contrast(${viewSettings.contrast}%) grayscale(100%)`,
                                    transform: `scale(${viewSettings.zoom}) translate(${viewSettings.pan.x}px, ${viewSettings.pan.y}px)`
                                }}
                            />

                            {/* Corner Overlays */}
                            <div className="absolute top-3 left-3 flex flex-col pointer-events-none">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter drop-shadow-md">{patientData?.patientName || "PATIENT"}</span>
                                <span className="text-[9px] font-bold text-blue-400/80 drop-shadow-md">{modality} / {patientData?.bodyPart || "SCAN"}</span>
                            </div>

                            <div className="absolute bottom-3 left-3 flex flex-col text-[8px] font-mono text-slate-400 pointer-events-none">
                                <span>SLICE: {slice} / 120</span>
                                <span>W: {viewSettings.contrast * 4} L: {viewSettings.brightness - 100}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Floating Presets (Auto-hide or on right) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
                    {presets.map((p: string) => (
                        <button
                            key={p}
                            onClick={() => applyPreset(p)}
                            className="px-2 py-1 bg-black/60 hover:bg-blue-600/80 backdrop-blur-md border border-white/10 rounded text-[8px] font-bold text-slate-300 hover:text-white uppercase transition-all"
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer / Series Bar */}
            <div className="h-10 bg-black border-t border-white/5 flex items-center px-4 gap-4 shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase shrink-0">
                    <LayoutGrid size={12} /> Series (1/1)
                </div>
                <div className="flex gap-2">
                    <div className="h-6 w-10 bg-blue-600/20 rounded border border-blue-500/30 flex items-center justify-center cursor-pointer">
                        <span className="text-[8px] font-bold text-blue-400">S1</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
