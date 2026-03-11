import * as React from "react"
import { useRBAC } from "../../context/RoleContext"

interface RoleGuardProps {
  allowed: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowed, children, fallback = null }) => {
  const { user } = useRBAC()
  if (!user || !allowed.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
