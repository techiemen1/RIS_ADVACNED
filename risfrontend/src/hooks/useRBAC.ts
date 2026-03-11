
import { useContext } from "react"
import { RoleContext } from "../context/RoleContext"

export const useRBAC = () => {
  const context = useContext(RoleContext)
  if (!context) {
    console.warn("useRBAC called outside RoleProvider")
    return {
      user: null,
      setUser: () => {},
      logout: () => {},
      isAuthenticated: false,
    }
  }
  return context
}
