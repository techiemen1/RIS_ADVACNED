import * as React from "react"
import { cn } from "../../lib/utils"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
}

export const Toast: React.FC<ToastProps> = ({ message, type = "info" }) => {
  const base = "px-4 py-2 rounded shadow text-sm font-medium"
  const styles = {
    success: "bg-green-100 text-green-800 border border-green-300",
    error: "bg-red-100 text-red-800 border border-red-300",
    info: "bg-blue-100 text-blue-800 border border-blue-300"
  }

  return (
    <div className={cn(base, styles[type])} role="alert">
      {message}
    </div>
  )
}
