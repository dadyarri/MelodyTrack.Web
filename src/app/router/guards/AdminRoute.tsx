import type { ReactNode } from "react";
import { hasAdminAccess } from "@/features/auth/access";
import { RouteGate } from "./RouteGate";

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={hasAdminAccess} redirectTo="/">
      {children}
    </RouteGate>
  );
}
