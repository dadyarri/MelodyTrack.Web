import { useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useCallback, useEffect, useRef } from "react";

import { appointmentQueryKeys, appointmentsApi } from "@/entities/appointment";
import { clientQueryKeys, clientsApi } from "@/entities/client";
import { analyticsQueryKeys } from "@/entities/dashboard";
import { expenseQueryKeys, expensesApi } from "@/entities/expense";
import {
  formatQueuedClientLabel,
  getOfflineQueueRepository,
  loadOfflineQueue,
  offlineQueueChangedEventName,
  replayOfflineQueue,
  setOfflineSyncStatus,
  shouldQueueOfflineError,
} from "@/entities/offline-queue";
import { paymentQueryKeys, paymentsApi } from "@/entities/payment";
import { serviceQueryKeys, servicesApi } from "@/entities/service";
import { authStore } from "@/entities/session";
import { probeBackendReachable } from "@/shared/api";

export function OfflineQueueSync() {
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const isSyncingRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine || !authStore.hasSession()) {
      if (loadOfflineQueue().length > 0 && !navigator.onLine) {
        setOfflineSyncStatus("pending");
      }
      return;
    }

    const repository = getOfflineQueueRepository();
    if (repository.list().length === 0) {
      setOfflineSyncStatus("synced");
      return;
    }

    isSyncingRef.current = true;
    setOfflineSyncStatus("syncing");

    try {
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
            await servicesApi.create(
              { ...item.payload, isConsultation: item.payload.isConsultation ?? false },
              { replayKey: item.replayKey },
            );
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
                clientId: resolveId(item.payload.clientId),
              },
              { replayKey: item.replayKey },
            );
            return;
          }

          await appointmentsApi.create(
            {
              ...item.payload,
              clientId: resolveId(item.payload.clientId),
            },
            { replayKey: item.replayKey },
          );
        },
      });

      if (result.status === "error" && result.failedItem) {
        const actionLabel =
          result.failedItem.kind === "clients:create" ? formatQueuedClientLabel(result.failedItem.payload) : result.failedItem.kind;
        message.error(`Не удалось отправить отложенное действие: ${actionLabel}`);
      }

      if (result.syncedCount > 0) {
        message.success(`Синхронизировано ${String(result.syncedCount)} отложенных изменений`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: clientQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: appointmentQueryKeys.appointmentsAll }),
          queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all }),
        ]);
      }

      setOfflineSyncStatus(result.status);
    } finally {
      isSyncingRef.current = false;
    }
  }, [message, queryClient]);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current !== null) {
      window.clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    const hasQueuedItems = loadOfflineQueue().length > 0;
    if (!hasQueuedItems) {
      setOfflineSyncStatus("synced");
      return;
    }

    const attemptSync = async () => {
      if (!navigator.onLine || !authStore.hasSession() || isSyncingRef.current) {
        if (!navigator.onLine && loadOfflineQueue().length > 0) {
          setOfflineSyncStatus("pending");
        }
        return;
      }

      if (!(await probeBackendReachable())) {
        setOfflineSyncStatus("pending");
        return;
      }

      await syncQueue();
    };

    attemptSync().catch(() => {});
    syncTimerRef.current = window.setInterval(() => {
      attemptSync().catch(() => {});
    }, 7000);
  }, [syncQueue]);

  useEffect(() => {
    scheduleSync();
    const hasQueuedItems = loadOfflineQueue().length > 0;
    const handleOnline = () => {
      scheduleSync();
    };
    const handleQueueChange = () => {
      scheduleSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleSync();
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener(offlineQueueChangedEventName, handleQueueChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!hasQueuedItems) {
      setOfflineSyncStatus("synced");
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(offlineQueueChangedEventName, handleQueueChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (syncTimerRef.current !== null) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [scheduleSync]);

  return null;
}
