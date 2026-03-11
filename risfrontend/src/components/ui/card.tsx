import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-white shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("border-b p-4 font-semibold text-gray-800", className)}
    {...props}
  />
)
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-medium leading-none tracking-tight", className)}
      {...props}
    >
      {children || <span className="sr-only">Card title</span>}
    </h3>
  )
)
CardTitle.displayName = "CardTitle"

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...props} />
)
CardContent.displayName = "CardContent"

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-t p-4 flex items-center justify-end", className)} {...props} />
)
CardFooter.displayName = "CardFooter"

const CardBadge = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-block text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 px-2 py-1 rounded",
      className
    )}
    {...props}
  >
    {children}
  </span>
)
CardBadge.displayName = "CardBadge"

const CardActions = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />
)
CardActions.displayName = "CardActions"

export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardBadge,
  CardActions
}
