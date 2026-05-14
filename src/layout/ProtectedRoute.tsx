import { ReactNode } from "react";
import { RouteGate } from "./RouteGate";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <RouteGate allow={(user) => Boolean(user)} redirectTo="/login" preserveFrom>
      {children}
    </RouteGate>
  );
}
