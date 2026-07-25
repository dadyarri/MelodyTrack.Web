import type { QueryKey } from "@tanstack/react-query";

import { appointmentQueryKeys, appointmentsApi } from "@/entities/appointment";
import { clientQueryKeys, clientsApi } from "@/entities/client";
import { analyticsQueryKeys } from "@/entities/dashboard";
import { expenseQueryKeys, expensesApi } from "@/entities/expense";
import { type OfflineQueueRepository, replayOfflineQueue, shouldQueueOfflineError } from "@/entities/offline-queue";
import { paymentQueryKeys, paymentsApi } from "@/entities/payment";
import { serviceQueryKeys, servicesApi } from "@/entities/service";

const invalidationKeys: QueryKey[] = [
  clientQueryKeys.all,
  serviceQueryKeys.all,
  paymentQueryKeys.all,
  expenseQueryKeys.all,
  appointmentQueryKeys.appointmentsAll,
  analyticsQueryKeys.all,
];

export async function replayQueuedCommands(repository: OfflineQueueRepository) {
  const result = await replayOfflineQueue({
    repository,
    isRetryableError: shouldQueueOfflineError,
    execute: async (item, resolveId) => {
      if (item.kind === "clients:create") {
        const response = await clientsApi.create(item.payload, { replayKey: item.replayKey });
        return {
          tempIdReplacement: {
            temporaryId: item.tempId,
            serverId: response.id,
          },
        };
      }

      if (item.kind === "services:create") {
        await servicesApi.create({ ...item.payload, isConsultation: item.payload.isConsultation ?? false }, { replayKey: item.replayKey });
        return;
      }

      if (item.kind === "expenses:create") {
        await expensesApi.create(item.payload, { replayKey: item.replayKey });
        return;
      }

      if (item.kind === "payments:create") {
        await paymentsApi.create(
          {
            ...item.payload,
            clientId: await resolveId(item.payload.clientId),
          },
          { replayKey: item.replayKey },
        );
        return;
      }

      await appointmentsApi.create(
        {
          ...item.payload,
          clientId: await resolveId(item.payload.clientId),
        },
        { replayKey: item.replayKey },
      );
    },
  });

  return { invalidationKeys, result };
}
