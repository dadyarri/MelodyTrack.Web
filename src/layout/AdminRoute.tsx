import { Navigate } from "react-router";
import { ReactNode } from "react";
import { Spin } from "antd";
import { useAuth } from "../features/auth/useAuth";

export function AdminRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.isLoading) {
    return <Spin fullscreen />;
  }

  if (!auth.user) {
    return null;
  }

  if (!auth.user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
