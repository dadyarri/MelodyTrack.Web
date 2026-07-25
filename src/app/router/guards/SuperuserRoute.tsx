import type { ReactNode } from "react";
import { hasSuperuserAccess } from "@/features/auth/access";
import { RouteGate } from "./RouteGate";

export function SuperuserRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={hasSuperuserAccess} redirectTo="/">
      {children}
    </RouteGate>
  );
}
