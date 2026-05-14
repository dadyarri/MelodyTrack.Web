import { Spin } from "antd";
import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/useAuth";

type RouteGateProps = {
  children: ReactNode;
  allow: (user: ReturnType<typeof useAuth>["user"]) => boolean;
  redirectTo: string;
  preserveFrom?: boolean;
};

export function RouteGate({ children, allow, redirectTo, preserveFrom = false }: RouteGateProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <Spin fullscreen />;
  }

  if (!allow(auth.user)) {
    return <Navigate to={redirectTo} state={preserveFrom ? { from: location } : undefined} replace />;
  }

  return children;
}
