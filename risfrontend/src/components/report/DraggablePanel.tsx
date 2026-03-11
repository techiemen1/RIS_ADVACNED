import React, { useState, useRef, useEffect } from "react";

export default function DraggablePanel({
  children,
  defaultX = 80,
  defaultY = 120,
}: {
  children: React.ReactNode;
  defaultX?: number;
  defaultY?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };

  const onMouseUp = () => setDragging(false);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  return (
    <div
      ref={panelRef}
      className="absolute no-print"
      style={{ left: pos.x, top: pos.y, cursor: dragging ? "grabbing" : "grab", zIndex: 9999 }}
    >
      <div onMouseDown={onMouseDown} className="w-full h-5 bg-slate-800 rounded-t-lg cursor-grab" />
      <div className="rounded-b-lg shadow-xl">{children}</div>
    </div>
  );
}
