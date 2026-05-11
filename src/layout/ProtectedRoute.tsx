import { Navigate, useLocation } from "react-router";
import { ReactNode } from "react";
import { Spin } from "antd";
import { useAuth } from "../features/auth/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <Spin fullscreen />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
