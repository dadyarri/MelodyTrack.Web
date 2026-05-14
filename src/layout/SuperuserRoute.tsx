import type { ReactNode } from "react";
import { RouteGate } from "./RouteGate";

export function SuperuserRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={(user) => Boolean(user?.isSuperuser)} redirectTo="/">
      {children}
    </RouteGate>
  );
}
