
import React, { useEffect, useImperativeHandle, useState, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const CommandList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selection when items change
    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }
            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }
            if (event.key === 'Enter') {
                enterHandler()
                return true
            }
            return false
        },
    }))

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    return (
        <div className="z-50 min-w-[300px] overflow-hidden rounded-md border bg-white p-1 text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
            <div className="text-xs font-medium text-slate-500 px-2 py-1.5 mb-1 bg-slate-50 border-b -mx-1 -mt-1">
                Commands & Templates
            </div>
            {props.items.length ? (
                props.items.map((item: any, index: number) => (
                    <button
                        className={cn(
                            "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                            index === selectedIndex ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                        )}
                        key={index}
                        onClick={() => selectItem(index)}
                    >
                        <div className="flex h-5 w-5 mr-2 items-center justify-center rounded border border-slate-200 bg-white">
                            {item.icon || <span className="text-[10px] font-bold text-slate-400">T</span>}
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium">{item.title}</span>
                            {item.subtitle && <span className="text-[10px] text-slate-400">{item.subtitle}</span>}
                        </div>
                    </button>
                ))
            ) : (
                <div className="px-2 py-1.5 text-sm text-slate-500">No results found</div>
            )}
        </div>
    )
})

CommandList.displayName = 'CommandList'
