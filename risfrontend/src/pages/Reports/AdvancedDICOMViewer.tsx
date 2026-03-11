import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Sun, 
  Maximize2, 
  LayoutGrid, 
  Move, 
  Crosshair, 
  Camera, 
  Database, 
  Cpu, 
  History,
  ChevronRight,
  Clock,
  Settings
} from 'lucide-react';

const MODALITIES = {
  CT: { presets: ['Lung', 'Bone', 'Mediastinum', 'Soft Tissue'], color: 'text-blue-400' },
  MRI: { presets: ['T1', 'T2', 'FLAIR', 'DWI'], color: 'text-purple-400' },
  XR: { presets: ['Standard', 'Inverted'], color: 'text-emerald-400' }
};

const PATIENT_DATA = {
  name: "POOJA",
  info: "24Y/F",
  id: "3046769",
  study: "CT CHEST W/O CONTRAST",
  accession: "ACC-4492-PX",
  date: "20-DEC-2023 11:45"
};

const DicomViewer = () => {
  const [layout, setLayout] = useState('2x2'); 
  const [activeTool, setActiveTool] = useState('window');
  const [slice, setSlice] = useState(62);
  const [viewSettings, setViewSettings] = useState({ brightness: 100, contrast: 100, zoom: 1.2, pan: { x: 0, y: 0 } });
  const viewportRef = useRef(null);

  // Sync modality to CT for this patient
  const activeModality = "CT";

  const handleInteraction = useCallback((e) => {
    if (e.buttons !== 1) return;
    if (activeTool === 'window') {
      setViewSettings(p => ({
        ...p,
        contrast: Math.max(50, p.contrast + e.movementX),
        brightness: Math.max(50, p.brightness - e.movementY)
      }));
    } else if (activeTool === 'pan') {
      setViewSettings(p => ({ ...p, pan: { x: p.pan.x + e.movementX, y: p.pan.y + e.movementY } }));
    }
  }, [activeTool]);

  const applyPreset = (preset) => {
    const presets = {
      'Lung': { contrast: 180, brightness: 70 },
      'Bone': { contrast: 280, brightness: 110 },
      'Mediastinum': { contrast: 130, brightness: 90 }
    };
    if (presets[preset]) setViewSettings(p => ({ ...p, ...presets[preset] }));
  };

  useEffect(() => {
    // Standard initialization for advanced rendering engine
    console.log("Diagnostic Engine Initialized for Patient:", PATIENT_DATA.id);
  }, []);

  return (
    <div className="flex h-full bg-black text-slate-300 font-sans select-none overflow-hidden border-r border-white/10">
      {/* Sidebar: Jacket & Tools */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-4 bg-blue-600/5 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diagnostic Context</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-white">{PATIENT_DATA.name} {PATIENT_DATA.info}</p>
            <p className="text-[10px] text-slate-500 font-mono italic">MRN: {PATIENT_DATA.id}</p>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-6">
          <section>
            <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Modality Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {MODALITIES[activeModality].presets.map(p => (
                <button key={p} onClick={() => applyPreset(p)} className="py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 hover:bg-blue-600 hover:text-white transition-all uppercase">{p}</button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Series Browser</h3>
            <div className="space-y-2">
              <div className="p-2 bg-blue-600/20 border border-blue-500/50 rounded-lg flex items-center gap-3">
                 <div className="w-10 h-10 bg-black rounded border border-white/10 overflow-hidden shrink-0">
                    <img src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=100" alt="S01" className="w-full h-full object-cover grayscale" />
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-[9px] font-bold text-white truncate uppercase">Axial Soft Tissue</p>
                    <p className="text-[8px] text-blue-400 font-mono">120 Images</p>
                 </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40">
           <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1"><Cpu size={12}/> GPU Acceleration</span>
              <span className="text-emerald-500 font-bold">ACTIVE</span>
           </div>
        </div>
      </aside>

      {/* Main Viewport Grid */}
      <section className="flex-1 flex flex-col min-w-0" ref={viewportRef}>
        <header className="h-12 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <ToolButton active={layout === '1x1'} onClick={() => setLayout('1x1')} icon={<Maximize2 size={14}/>} />
            <ToolButton active={layout === '2x2'} onClick={() => setLayout('2x2')} icon={<LayoutGrid size={14}/>} />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolBtn id="window" active={activeTool} onClick={setActiveTool} icon={<Sun size={14}/>} />
            <ToolBtn id="pan" active={activeTool} onClick={setActiveTool} icon={<Move size={14}/>} />
            <ToolBtn id="measure" active={activeTool} onClick={setActiveTool} icon={<Crosshair size={14}/>} />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">
            <Camera size={14} /> Capture Finding
          </button>
        </header>

        <div className={`flex-1 grid gap-0.5 p-0.5 bg-white/5 ${layout === '1x1' ? 'grid-cols-1' : 'grid-cols-2 grid-rows-2'}`}>
          {Array.from({ length: layout === '1x1' ? 1 : 4 }).map((_, i) => (
            <div 
              key={i} 
              className={`relative bg-black overflow-hidden flex items-center justify-center ${i === 0 ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              onMouseMove={i === 0 ? handleInteraction : undefined}
              onWheel={(e) => setSlice(s => Math.max(1, Math.min(120, s + (e.deltaY > 0 ? 1 : -1))))}
            >
              <img 
                src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1200" 
                alt="Viewport Slice"
                className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-75"
                style={{
                  filter: `brightness(${viewSettings.brightness}%) contrast(${viewSettings.contrast}%) grayscale(100%)`,
                  transform: `scale(${viewSettings.zoom}) translate(${viewSettings.pan.x}px, ${viewSettings.pan.y}px)`
                }}
              />
              <div className="absolute top-4 left-4 text-[10px] font-mono text-emerald-400/80 pointer-events-none uppercase">
                <p className="font-bold text-white mb-1">{PATIENT_DATA.name}</p>
                <p>IM: {slice} / 120</p>
                <p>W: {viewSettings.contrast * 4} L: {viewSettings.brightness - 100}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`p-2 rounded transition-all ${active ? 'text-blue-500 bg-white/10' : 'text-slate-600 hover:text-slate-300'}`}>{icon}</button>
);

const ToolBtn = ({ id, active, onClick, icon }) => (
  <button onClick={() => onClick(id)} className={`p-2 rounded transition-all ${active === id ? 'text-blue-500 bg-white/10 shadow-inner' : 'text-slate-600 hover:text-slate-300'}`}>{icon}</button>
);

export default DicomViewer;
