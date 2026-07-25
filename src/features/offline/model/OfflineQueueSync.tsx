import { useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useCallback, useEffect, useRef } from "react";

import {
  formatQueuedClientLabel,
  getOfflineQueueRepository,
  loadOfflineQueue,
  offlineQueueChangedEventName,
  setOfflineSyncStatus,
} from "@/entities/offline-queue";
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
      const { replayQueuedCommands } = await import("./replayQueuedCommands");
      const { invalidationKeys, result } = await replayQueuedCommands(repository);

      if (result.status === "error" && result.failedItem) {
        const actionLabel =
          result.failedItem.kind === "clients:create" ? formatQueuedClientLabel(result.failedItem.payload) : result.failedItem.kind;
        message.error(`Не удалось отправить отложенное действие: ${actionLabel}`);
      }

      if (result.syncedCount > 0) {
        message.success(`Синхронизировано ${String(result.syncedCount)} отложенных изменений`);
        await Promise.all(invalidationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
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
