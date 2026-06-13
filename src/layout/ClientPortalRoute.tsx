import type { ReactNode } from "react";
import { hasClientPortalAccess } from "@/features/auth/access";
import { RouteGate } from "./RouteGate";

export function ClientPortalRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={(user) => hasClientPortalAccess(user)} redirectTo="/login" preserveFrom>
      {children}
    </RouteGate>
  );
}
