import * as React from "react"
import { cn } from "../../lib/utils"

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  htmlFor: string
  children: React.ReactNode
  error?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  children,
  error,
  className,
  ...props
}) => (
  <div className={cn("mb-4", className)} {...props}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {children}
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
)
