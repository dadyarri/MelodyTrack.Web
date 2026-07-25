import type { MeResponse } from "@/api/auth";
import type { Client } from "@/entities/client";
import { hasAdminAccess } from "@/features/auth/access";
import type { NavigateFunction } from "react-router";

export function getClientHistoryActions(user: MeResponse | null | undefined, navigate: NavigateFunction) {
  if (!hasAdminAccess(user)) {
    return {
      onCreateAppointment: undefined,
      onCreatePayment: undefined,
    };
  }

  return {
    onCreateAppointment: (client: Pick<Client, "id">) => navigate("/schedule", { state: { openCreate: true, clientId: client.id } }),
    onCreatePayment: (client: Pick<Client, "id">) => navigate("/payments", { state: { openCreate: true, clientId: client.id } }),
  };
}
