import { useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useCallback, useEffect, useRef } from "react";
import { clientsApi, expensesApi, paymentsApi, scheduleApi, servicesApi } from "../api/crm";
import { probeBackendReachable } from "../api/http";
import { formatQueuedClientLabel, loadOfflineQueue, offlineQueueChangedEventName, removeOfflineQueueItem, shouldQueueOfflineError } from "../utils/offlineQueue";
import { authStore } from "../features/auth/authStore";
import { getOfflineSyncStatus, setOfflineSyncStatus } from "../utils/offlineSyncState";

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

    const queue = loadOfflineQueue();
    if (queue.length === 0) {
      setOfflineSyncStatus("synced");
      return;
    }

    isSyncingRef.current = true;
    setOfflineSyncStatus("syncing");
    const tempClientIds = new Map<string, string>();
    let syncedCount = 0;

    try {
      for (const item of queue) {
        try {
          if (item.kind === "clients:create") {
            const response = await clientsApi.create(item.payload, { replayKey: item.replayKey });
            tempClientIds.set(item.tempId, response.id);
            removeOfflineQueueItem(item.id);
            syncedCount += 1;
            continue;
          }

          if (item.kind === "services:create") {
            await servicesApi.create(item.payload, { replayKey: item.replayKey });
            removeOfflineQueueItem(item.id);
            syncedCount += 1;
            continue;
          }

          if (item.kind === "expenses:create") {
            await expensesApi.create(item.payload, { replayKey: item.replayKey });
            removeOfflineQueueItem(item.id);
            syncedCount += 1;
            continue;
          }

          if (item.kind === "payments:create") {
            await paymentsApi.create({
              ...item.payload,
              clientId: tempClientIds.get(item.payload.clientId) ?? item.payload.clientId,
            }, { replayKey: item.replayKey });
            removeOfflineQueueItem(item.id);
            syncedCount += 1;
            continue;
          }

          if (item.kind === "appointments:create") {
            await scheduleApi.create({
              ...item.payload,
              clientId: tempClientIds.get(item.payload.clientId) ?? item.payload.clientId,
            }, { replayKey: item.replayKey });
            removeOfflineQueueItem(item.id);
            syncedCount += 1;
          }
        } catch (error) {
          if (shouldQueueOfflineError(error)) {
            setOfflineSyncStatus("pending");
            break;
          }

          setOfflineSyncStatus("error");
          message.error(`Не удалось отправить отложенное действие: ${item.kind === "clients:create" ? formatQueuedClientLabel(item.payload) : item.kind}`);
          break;
        }
      }

      if (syncedCount > 0) {
        message.success(`Синхронизировано ${syncedCount} отложенных изменений`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["clients"] }),
          queryClient.invalidateQueries({ queryKey: ["services"] }),
          queryClient.invalidateQueries({ queryKey: ["payments"] }),
          queryClient.invalidateQueries({ queryKey: ["expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["schedule"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        ]);
      }

      if (loadOfflineQueue().length === 0) {
        setOfflineSyncStatus("synced");
      } else if (getOfflineSyncStatus() !== "error") {
        setOfflineSyncStatus("pending");
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [message, queryClient]);

  const scheduleSync = useCallback(async () => {
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

    void attemptSync();
    syncTimerRef.current = window.setInterval(() => {
      void attemptSync();
    }, 7000);
  }, [syncQueue]);

  useEffect(() => {
    void scheduleSync();
    const hasQueuedItems = loadOfflineQueue().length > 0;
    const handleOnline = () => {
      void scheduleSync();
    };
    const handleQueueChange = () => {
      void scheduleSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void scheduleSync();
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
