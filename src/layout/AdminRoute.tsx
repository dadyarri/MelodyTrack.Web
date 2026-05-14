import { ReactNode } from "react";
import { RouteGate } from "./RouteGate";

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={(user) => Boolean(user?.isAdmin)} redirectTo="/">
      {children}
    </RouteGate>
  );
}
