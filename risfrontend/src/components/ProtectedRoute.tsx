// src/components/ProtectedRoute.tsx
import { useRBAC } from "../context/RoleContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles,
}) => {
  const { user, isAuthenticated, isLoading } = useRBAC();

  if (isLoading) {
    // Ideally render a full page loader here
    return <div className="p-10 text-center">Loading Session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Return children directly (Layout is usually passed as child or handled by Router)
  return <>{children}</>;
};

export default ProtectedRoute;

