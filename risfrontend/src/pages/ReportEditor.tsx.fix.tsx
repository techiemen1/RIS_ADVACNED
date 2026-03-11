// Temporary fix file to hold the correct end of ReportEditor.tsx
            </DraggablePanel >
          )}
        </div >
      </div >
    </div >
  );
}

function DraggablePanel({ children, onClose, title = "Key Images", subtitle, className = "w-64" }: { children: React.ReactNode; onClose: () => void; title?: string; subtitle?: string; className?: string }) {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: Math.max(0, Math.min(window.innerWidth - 600, e.clientX - dragOffset.x)),
                    y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y))
                });
            }
        };
        const onMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [isDragging, dragOffset]);

    return (
        <div className={`absolute z-[9000] flex flex-col bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 ${className}`} style={{ left: position.x, top: position.y }}>
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-move select-none active:bg-slate-100" onMouseDown={onMouseDown}>
                <div className="flex items-center gap-2 pointer-events-none">
                    <ImagePlus size={16} className="text-blue-600" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-widest">{title}</span>
                    {subtitle && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{subtitle}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-500" onClick={onClose}><X size={14} /></Button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
