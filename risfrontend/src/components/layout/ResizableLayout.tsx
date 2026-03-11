import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';

type Direction = 'horizontal' | 'vertical';

interface ResizableLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    initialSplit?: number; // percentage (0-100)
    direction?: Direction;
    minSize?: number; // pixels
}

export function ResizableLayout({
    left,
    right,
    initialSplit = 50,
    direction = 'horizontal',
    minSize = 100,
}: ResizableLayoutProps) {
    const [split, setSplit] = useState(initialSplit);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newSplit = 50;

            if (direction === 'horizontal') {
                const x = e.clientX - rect.left;
                newSplit = (x / rect.width) * 100;
            } else {
                const y = e.clientY - rect.top;
                newSplit = (y / rect.height) * 100;
            }

            // Constrain
            // We can also use pixels for minSize logic if needed, but keeping it simple for now
            if (newSplit < 5) newSplit = 5;
            if (newSplit > 95) newSplit = 95;

            setSplit(newSplit);
        };

        const onMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            // Add a global cursor override to body while dragging
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, direction]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full flex overflow-hidden ${direction === 'horizontal' ? 'flex-row' : 'flex-col'}`}
        >
            {/* Pane 1 (Left/Top) */}
            <div style={{ flexBasis: `${split}%` }} className="relative min-h-0 min-w-0 flex flex-col">
                {left}
                {/* Overlay to catch events over iframes during drag */}
                {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>

            {/* Resize Handle */}
            <div
                className={`relative z-40 bg-slate-200 hover:bg-blue-400 transition-colors flex items-center justify-center shrink-0 
          ${direction === 'horizontal' ? 'w-2 cursor-col-resize hover:scale-x-110 active:scale-x-125' : 'h-2 cursor-row-resize hover:scale-y-110 active:scale-y-125'}
          ${isDragging ? 'bg-blue-500' : ''}
        `}
                onMouseDown={onMouseDown}
            >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400">
                    {direction === 'horizontal' ? (
                        <GripVertical size={12} />
                    ) : (
                        <GripHorizontal size={12} />
                    )}
                </div>
            </div>

            {/* Pane 2 (Right/Bottom) */}
            <div style={{ flexBasis: `${100 - split}%` }} className="relative min-h-0 min-w-0 flex flex-col">
                {right}
                {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>
        </div>
    );
}
