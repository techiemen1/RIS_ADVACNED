import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const DialogContext = React.createContext<{
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)

export const Dialog: React.FC<{ children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }> = ({ children, open: controlledOpen, onOpenChange }) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen
    const setOpen = React.useCallback((newVal: boolean | ((prev: boolean) => boolean)) => {
        if (onOpenChange) {
            const val = typeof newVal === 'function' ? newVal(open) : newVal
            onOpenChange(val)
        }
        if (!isControlled) {
            setUncontrolledOpen(newVal)
        }
    }, [isControlled, onOpenChange, open])

    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    )
}

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ asChild, children }) => {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogTrigger must be used within Dialog")

    const handleClick = (e: React.MouseEvent) => {
        // (children as any).props.onClick?.(e)
        context.setOpen(true)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { onClick: handleClick } as any)
    }

    return <button onClick={handleClick}>{children}</button>
}

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogContent must be used within Dialog")

    if (!context.open) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0">
            <div
                className={cn(
                    "relative w-full max-w-lg bg-white p-6 shadow-xl sm:rounded-lg animate-in zoom-in-95 duration-200",
                    className
                )}
                {...props}
            >
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500"
                    onClick={() => context.setOpen(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                {children}
            </div>
        </div>
    )
}
