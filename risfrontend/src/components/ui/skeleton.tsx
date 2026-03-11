import * as React from "react"
import { cn } from "../../lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
  rounded?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  rounded = true,
  className,
  ...props
}) => (
  <div
    className={cn(
      "animate-pulse bg-gray-200",
      rounded && "rounded",
      className
    )}
    style={{ width, height }}
    {...props}
  />
)
