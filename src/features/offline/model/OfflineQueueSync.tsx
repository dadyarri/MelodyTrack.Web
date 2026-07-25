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
import { authStore, useAuth } from "@/entities/session";
import { probeBackendReachable } from "@/shared/api";

export function OfflineQueueSync() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const isSyncingRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  const syncQueue = useCallback(async () => {
    if (!auth.user || isSyncingRef.current || !navigator.onLine || !authStore.hasSession()) {
      if (auth.user && (await loadOfflineQueue()).length > 0 && !navigator.onLine) {
        setOfflineSyncStatus("pending");
      }
      return;
    }

    const repository = await getOfflineQueueRepository();
    if ((await repository.list()).length === 0) {
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
  }, [auth.user, message, queryClient]);

  const scheduleSync = useCallback(async () => {
    if (syncTimerRef.current !== null) {
      window.clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    if (!auth.user) {
      setOfflineSyncStatus("synced");
      return;
    }

    const hasQueuedItems = (await loadOfflineQueue()).length > 0;
    if (!hasQueuedItems) {
      setOfflineSyncStatus("synced");
      return;
    }

    const attemptSync = async () => {
      if (!navigator.onLine || !authStore.hasSession() || isSyncingRef.current) {
        if (!navigator.onLine && (await loadOfflineQueue()).length > 0) {
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
  }, [auth.user, syncQueue]);

  useEffect(() => {
    void scheduleSync();
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
