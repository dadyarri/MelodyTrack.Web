import type { ReactNode } from "react";
import { hasStatsAccess } from "@/features/auth/access";
import { RouteGate } from "./RouteGate";

export function StatsRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={hasStatsAccess} redirectTo="/">
      {children}
    </RouteGate>
  );
}
