import type { ReactNode } from "react";
import { RouteGate } from "./RouteGate";

export function StatsRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={(user) => Boolean(user?.isAdmin || user?.isSuperuser)} redirectTo="/">
      {children}
    </RouteGate>
  );
}
